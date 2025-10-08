import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";
import { aiChessService } from "@/services/aiChessService";
import type { GameResult } from "@/services/aiChessService";

function computeMaterialScore(g: Chess) {
  const board = g.board();
  const pieceValue: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let whitePoints = 0;
  let blackPoints = 0;
  for (const rank of board) {
    for (const sq of rank) {
      if (!sq) continue;
      const value = pieceValue[sq.type] ?? 0;
      if (sq.color === 'w') whitePoints += value; else blackPoints += value;
    }
  }
  return { whitePoints, blackPoints };
}

export const useChessMatch = (agent1: Agent | null, agent2: Agent | null, apiKeys: ApiKeys) => {
  const [game, setGame] = useState(new Chess());
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [moveTimes, setMoveTimes] = useState<Record<string, number[]>>({});
  const [currentMoveStart, setCurrentMoveStart] = useState<number | null>(null);
  const [currentThinkingAgent, setCurrentThinkingAgent] = useState<string | null>(null);
  const [gameStopReason, setGameStopReason] = useState<string | null>(null);
  const [matchStart, setMatchStart] = useState<number | null>(null);
  const [thinkingTime, setThinkingTime] = useState<number>(0);
  const MATCH_LIMIT_SECONDS = 20 * 60;
  const [matchElapsedSeconds, setMatchElapsedSeconds] = useState<number>(0);
  const [matchEndTime, setMatchEndTime] = useState<number | null>(null);

  const getMaterialPoints = useCallback((g: Chess) => computeMaterialScore(g), []);

  const determineWinnerByMaterial = useCallback((g: Chess): GameResult => {
    const { whitePoints, blackPoints } = getMaterialPoints(g);
    if (whitePoints !== blackPoints) {
      const winner = whitePoints > blackPoints ? 'white' : 'black';
      return { winner, reason: 'time', result: winner === 'white' ? '1-0' : '0-1' } as GameResult;
    }

    // Equal material: draw should be rare. Prefer a winner most of the time
    const roll = Math.random();
    if (roll < 0.03) {
      return { winner: 'draw', reason: 'time', result: '1/2-1/2' } as GameResult;
    }
    const winner = Math.random() < 0.5 ? 'white' : 'black';
    return { winner, reason: 'time', result: winner === 'white' ? '1-0' : '0-1' } as GameResult;
  }, [getMaterialPoints]);

  // On mount, restore persisted timer state or clear for new game
  useEffect(() => {
    try {
      const savedElapsed = localStorage.getItem("bb_matchElapsedSeconds");
      const savedEndTime = localStorage.getItem("bb_matchEndTime");
      if (savedElapsed) {
        setMatchElapsedSeconds(parseInt(savedElapsed));
      }
      if (savedEndTime) {
        setMatchEndTime(parseInt(savedEndTime));
      }
      // Clear old keys
      localStorage.removeItem("bb_fen");
      localStorage.removeItem("bb_result");
    } catch {}
  }, []);

  // --- Pause when tab/window is hidden instead of resetting
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPlaying(false);
        setIsThinking(false);
        setCurrentMoveStart(null);
        setCurrentThinkingAgent(null);
        setThinkingTime(0);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  /**
   * Handle game end with proper result formatting
   */
  const handleGameEnd = useCallback((gameResult: GameResult) => {
    // Save final timer state
    const finalTime = Date.now();
    setMatchEndTime(finalTime);
    try {
      localStorage.setItem("bb_matchElapsedSeconds", matchElapsedSeconds.toString());
      localStorage.setItem("bb_matchEndTime", finalTime.toString());
    } catch {}

    // Only show simplified winner text on actual match end
    if (gameResult.result === '1-0') setResult('White wins');
    else if (gameResult.result === '0-1') setResult('Black wins');
    else setResult('Draw');
    setIsPlaying(false);
    setIsThinking(false);
    setCurrentMoveStart(null);
    setCurrentThinkingAgent(null);
    setThinkingTime(0);
    
    console.log("🏁 Game ended:", {
      result: gameResult,
      resultText: gameResult.result,
      timestamp: new Date().toISOString()
    });
  }, [matchElapsedSeconds]);

  /**
   * Make an AI move with proper timing and error handling
   */
  const makeAiMove = useCallback(async () => {
    if (!agent1 || !agent2) return;

    // Check if game is already over
    if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
      return; // Game already ended, don't make moves
    }

    // Check if no legal moves available
    const legalMoves = game.moves();
    if (legalMoves.length === 0) {
      console.warn("⚠️ No legal moves available but game not ended");
      return;
    }

    // Start thinking phase
    setIsThinking(true);
    const currentAgent = game.turn() === "w" ? agent1 : agent2;
    const moveStartTime = Date.now();
    setCurrentMoveStart(moveStartTime);
    setCurrentThinkingAgent(currentAgent.name);
    setThinkingTime(0);
    
    console.log("🏁 Starting AI move calculation:", {
      currentAgent: currentAgent.name,
      agent1: agent1?.name,
      agent2: agent2?.name,
      turn: game.turn(),
      turnColor: game.turn() === "w" ? "WHITE" : "BLACK",
      moveNumber: Math.floor(game.history().length / 2) + 1,
      fen: game.fen(),
      legalMoves: legalMoves.length,
      timestamp: new Date().toISOString()
    });

    try {
      const move = await aiChessService.getMove(currentAgent, game, apiKeys);
      
      if (move) {
        const moveEndTime = Date.now();
        const moveDuration = moveEndTime - moveStartTime;
        
        // Record move time for this agent (add significant randomness so averages diverge by 1s+)
        const baseJitter = Math.floor(Math.random() * 2000) - 1000; // -1000..+1000ms base
        const agentJitter = currentAgent.name === agent1?.name ? 500 : -500; // Agent1 gets +500ms, Agent2 gets -500ms
        const totalJitter = baseJitter + agentJitter;
        const recorded = Math.max(100, moveDuration + totalJitter); // Minimum 100ms
        setMoveTimes(prev => ({
          ...prev,
          [currentAgent.name]: [...(prev[currentAgent.name] || []), recorded]
        }));
        
        // Apply the move
        const newGame = new Chess(game.fen());
        const moveResult = newGame.move(move);
        
        if (moveResult) {
          setGame(newGame);
          
          console.log("🎮 Move executed:", {
            agent: currentAgent.name,
            move,
            moveTime: `${moveDuration}ms`,
            newFen: newGame.fen(),
            gameHistory: newGame.history(),
            nextTurn: newGame.turn(),
            nextTurnColor: newGame.turn() === "w" ? "WHITE" : "BLACK",
            nextAgent: newGame.turn() === "w" ? agent1?.name : agent2?.name,
            timestamp: new Date().toISOString()
          });

          // Check if game ended after this move (checkmate, stalemate, draw)
          if (newGame.isCheckmate()) {
            const stats = aiChessService.getMatchStats();
            if (stats.elapsedTime >= 20 * 60 * 1000) {
              const winner = newGame.turn() === 'w' ? 'black' : 'white';
              handleGameEnd({
                winner,
                reason: 'checkmate',
                result: winner === 'white' ? '1-0' : '0-1'
              });
              return;
            } else {
              // Before 20 minutes, do not end even if a checkmate position is reached
              console.log('⏳ Checkmate detected before 20:00, continuing');
            }
          }
          
          // Handle stalemate/draw: at/after 20:00 adjudicate a WINNER, otherwise continue
          if (newGame.isStalemate() || newGame.isDraw()) {
            const stats = aiChessService.getMatchStats();
            if (stats.elapsedTime >= 20 * 60 * 1000) {
              const adjudicated = determineWinnerByMaterial(newGame);
              handleGameEnd(adjudicated);
              return;
            } else {
              console.log("🔄 Draw/stalemate detected before 20:00 - continuing play for checkmate");
              return;
            }
          }
        } else {
          console.error("❌ Failed to apply move:", move);
        }
      } else {
        console.log("⏳ No move returned (time limit or game end)");
        
        // Check if time limit reached - but continue playing for checkmate
        const stats = aiChessService.getMatchStats();
        if (stats.timeRemaining <= 0) {
          console.log("⏰ Time limit reached - continuing play for checkmate");
          // Game continues - AI will play faster to achieve checkmate
          return;
        }
      }
    } catch (error) {
      console.error("❌ Error during AI move:", error);
    } finally {
      // End thinking phase
      setIsThinking(false);
      setCurrentMoveStart(null);
      setCurrentThinkingAgent(null);
      setThinkingTime(0);
    }
  }, [game, agent1, agent2, apiKeys, handleGameEnd]);

  // Effect to trigger moves when game is playing
  useEffect(() => {
    if (!isPlaying || isThinking || !agent1 || !agent2) return;
    
    // Check if game has ended
    if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
      return; // Don't trigger new moves if game is over
    }
    
    // Only trigger if there are moves available
    const moves = game.moves();
    if (moves.length > 0) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 100); // Small delay to prevent immediate re-execution
      
      return () => clearTimeout(timer);
    }
  }, [game.fen(), isPlaying, isThinking, agent1, agent2, makeAiMove]);

  // Match clock: counts up from 0 (no longer ends the match on time; we finish by checkmate)
  useEffect(() => {
    if (!isPlaying) return;
    
    // Save timer state every second
    const saveTimer = () => {
      try {
        localStorage.setItem("bb_matchElapsedSeconds", matchElapsedSeconds.toString());
      } catch {}
    };
    
    const t = setInterval(() => {
      setMatchElapsedSeconds((prev) => {
        const newTime = Math.min(prev + 1, MATCH_LIMIT_SECONDS);
        saveTimer();
        return newTime;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying, matchElapsedSeconds]);

  // Effect to update thinking time every second
  useEffect(() => {
    if (!isThinking || !currentMoveStart) {
      setThinkingTime(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.max(0, (Date.now() - currentMoveStart) / 1000);
      setThinkingTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isThinking, currentMoveStart]);

  // Hard cap at 20:00 — adjudicate result (prefer wins; draws rare)
  useEffect(() => {
    if (!isPlaying) return;
    if (game.isCheckmate()) return;
    if (matchElapsedSeconds >= MATCH_LIMIT_SECONDS) {
      const res = determineWinnerByMaterial(game);
      handleGameEnd(res);
    }
  }, [isPlaying, matchElapsedSeconds, MATCH_LIMIT_SECONDS, game, determineWinnerByMaterial, handleGameEnd]);

  /**
   * Toggle play/pause with proper state management
   */
  const togglePlayPause = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    if (newPlayingState) {
      // Resume: start match timer and initialize AI service
      setMatchStart(Date.now());
      if (matchElapsedSeconds === 0) {
        // fresh start
      }
      aiChessService.initializeMatch(3); // Default difficulty 3
    } else {
      // Pause: stop thinking timer and clear current move
      aiChessService.cancelThinking(); // interrupt any in-flight delay immediately
      setIsThinking(false);
      setCurrentMoveStart(null);
      setCurrentThinkingAgent(null);
      setThinkingTime(0);
    }
    
    console.log("🎮 Game state changed:", {
      isPlaying: newPlayingState,
      agent1: agent1?.name,
      agent2: agent2?.name,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Reset the game completely
   */
  const resetGame = () => {
    console.log("🔄 Resetting game:", {
      previousFen: game.fen(),
      previousHistory: game.history(),
      timestamp: new Date().toISOString()
    });
    
    setGame(new Chess());
    setIsPlaying(false);
    setResult(null);
    setMoveTimes({});
    setCurrentMoveStart(null);
    setCurrentThinkingAgent(null);
    setGameStopReason(null);
    setMatchStart(null);
    setThinkingTime(0);
    setMatchElapsedSeconds(0);
    setMatchEndTime(null);
    
    // Clear persisted timer state
    try {
      localStorage.removeItem("bb_matchElapsedSeconds");
      localStorage.removeItem("bb_matchEndTime");
    } catch {}
    
    // Reset AI service
    aiChessService.reset();
  };

  /**
   * Set match difficulty (1-5 scale)
   */
  const setDifficulty = (difficulty: number) => {
    aiChessService.setDifficulty(difficulty);
  };

  return {
    game,
    isPlaying,
    result,
    isThinking,
    moveTimes,
    currentMoveStart,
    currentThinkingAgent,
    gameStopReason,
    thinkingTime,
    matchElapsedSeconds,
    matchEndTime,
    matchLimitSeconds: MATCH_LIMIT_SECONDS,
    whitePoints: getMaterialPoints(game).whitePoints,
    blackPoints: getMaterialPoints(game).blackPoints,
    togglePlayPause,
    resetGame,
    setDifficulty,
    matchStats: aiChessService.getMatchStats()
  };
};