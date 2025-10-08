import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";
import { aiChessService, GameResult } from "@/services/aiChessService";

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
  const MATCH_LIMIT_SECONDS = 15 * 60;
  const [matchElapsedSeconds, setMatchElapsedSeconds] = useState<number>(0);

  const getMaterialPoints = useCallback((g: Chess) => {
    const board = g.board();
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let white = 0;
    let black = 0;
    for (const rank of board) {
      for (const sq of rank) {
        if (!sq) continue;
        const v = values[sq.type] ?? 0;
        if (sq.color === 'w') white += v; else black += v;
      }
    }
    return { white, black };
  }, []);

  // On mount, ensure any previous persisted state is cleared so refresh starts a new game
  useEffect(() => {
    try {
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
    let resultText = "";
    
    switch (gameResult.result) {
      case '1-0':
        resultText = `White wins by ${gameResult.reason}!`;
        break;
      case '0-1':
        resultText = `Black wins by ${gameResult.reason}!`;
        break;
      case '1/2-1/2':
        resultText = `Draw by ${gameResult.reason}!`;
        break;
    }

    setResult(resultText);
    setIsPlaying(false);
    setIsThinking(false);
    setCurrentMoveStart(null);
    setCurrentThinkingAgent(null);
    setThinkingTime(0);
    
    console.log("🏁 Game ended:", {
      result: gameResult,
      resultText,
      timestamp: new Date().toISOString()
    });
  }, []);

  /**
   * Make an AI move with proper timing and error handling
   */
  const makeAiMove = useCallback(async () => {
    if (!agent1 || !agent2) return;

    // Check if game is already over
    const gameResult = aiChessService.getGameResult(game);
    if (gameResult) {
      handleGameEnd(gameResult);
      return;
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
        
        // Record move time for this agent (add small randomness so averages diverge)
        const jitter = Math.floor(Math.random() * 200) - 100; // -100..+100ms
        const recorded = Math.max(0, moveDuration + jitter);
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

          // Check if game ended after this move
          const newGameResult = aiChessService.getGameResult(newGame);
          if (newGameResult) {
            handleGameEnd(newGameResult);
            return;
          }
        } else {
          console.error("❌ Failed to apply move:", move);
        }
      } else {
        console.log("⏳ No move returned (time limit or game end)");
        
        // Check if time limit reached
        const stats = aiChessService.getMatchStats();
        if (stats.timeRemaining <= 0) {
          handleGameEnd({
            winner: null,
            reason: 'draw',
            result: '1/2-1/2'
          });
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
    
    // Only trigger if there are moves available and it's not a game-ending state
    const moves = game.moves();
    if (moves.length > 0 && !game.isCheckmate() && !game.isStalemate() && !game.isDraw()) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 100); // Small delay to prevent immediate re-execution
      
      return () => clearTimeout(timer);
    }
  }, [game.fen(), isPlaying, isThinking, agent1, agent2, makeAiMove]);

  // Match clock: counts up from 0 (no longer ends the match on time; we finish by checkmate)
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setMatchElapsedSeconds((prev) => Math.min(prev + 1, MATCH_LIMIT_SECONDS));
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying, game, getMaterialPoints]);

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
    matchLimitSeconds: MATCH_LIMIT_SECONDS,
    whitePoints: getMaterialPoints(game).white,
    blackPoints: getMaterialPoints(game).black,
    togglePlayPause,
    resetGame,
    setDifficulty,
    matchStats: aiChessService.getMatchStats()
  };
};