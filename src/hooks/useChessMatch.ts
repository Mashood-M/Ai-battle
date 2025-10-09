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
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [loopTimeoutId, setLoopTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [currentGameDuration, setCurrentGameDuration] = useState<number>(0); // Current game's target duration in seconds
  const [is20MinMatch, setIs20MinMatch] = useState<boolean>(false); // Whether this match should end at exactly 20 minutes
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine); // Internet connectivity status

  const getMaterialPoints = useCallback((g: Chess) => computeMaterialScore(g), []);

  /**
   * Generate random game duration based on the specified distribution:
   * - 10% of matches end at exactly 20 minutes (1200 seconds)
   * - 90% regular matches: 80% chance 10-15 minutes, 15% chance 5-8 minutes, 5% chance 8-10 minutes
   * - Minimum duration: 5 minutes (300 seconds)
   */
  const generateRandomGameDuration = useCallback((): { duration: number; is20Min: boolean } => {
    // 10% chance for 20-minute matches
    const shouldBe20Min = Math.random() < 0.1; // 10% chance
    
    if (shouldBe20Min) {
      return { duration: 1200, is20Min: true }; // Exactly 20 minutes
    }
    
    // Regular variable duration matches with minimum 5 minutes
    const roll = Math.random();
    
    if (roll < 0.8) {
      // 80% chance: 10-15 minutes (most common)
      return { duration: Math.floor(Math.random() * (900 - 600 + 1)) + 600, is20Min: false };
    } else if (roll < 0.95) {
      // 15% chance: 5-8 minutes  
      return { duration: Math.floor(Math.random() * (480 - 300 + 1)) + 300, is20Min: false };
    } else {
      // 5% chance: 8-10 minutes
      return { duration: Math.floor(Math.random() * (600 - 480 + 1)) + 480, is20Min: false };
    }
  }, []);

  /**
   * Determine winner based on game type:
   * - Checkmate always wins regardless of match type or material points
   * - For 20-minute matches: Material points determine winner, draw if points exactly equal
   * - For regular matches: Material points determine winner, draw if points exactly equal
   */
  const determineWinnerByMaterial = useCallback((g: Chess): GameResult => {
    // Checkmate always wins regardless of match type
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'black' : 'white';
      return { winner, reason: 'checkmate', result: winner === 'white' ? '1-0' : '0-1' } as GameResult;
    }
    
    const { whitePoints, blackPoints } = getMaterialPoints(g);
    
    // Both match types use material points - no random selection
    if (whitePoints > blackPoints) {
      return { winner: 'white', reason: 'time', result: '1-0' } as GameResult;
    } else if (blackPoints > whitePoints) {
      return { winner: 'black', reason: 'time', result: '0-1' } as GameResult;
    } else {
      // Exactly equal points = draw
      return { winner: null, reason: 'draw', result: '1/2-1/2' } as GameResult;
    }
  }, [getMaterialPoints]);

  // On mount, restore persisted timer state only if game was actually running
  useEffect(() => {
    try {
      const savedElapsed = localStorage.getItem("bb_matchElapsedSeconds");
      const savedEndTime = localStorage.getItem("bb_matchEndTime");
      
      // Only restore timer if game was actually ended (not just paused)
      if (savedEndTime) {
        setMatchElapsedSeconds(parseInt(savedElapsed) || 0);
        setMatchEndTime(parseInt(savedEndTime));
      } else {
        // No saved end time means fresh start - reset timer
        setMatchElapsedSeconds(0);
        setMatchEndTime(null);
        localStorage.removeItem("bb_matchElapsedSeconds");
      }
      
      // Clear old keys
      localStorage.removeItem("bb_fen");
      localStorage.removeItem("bb_result");
    } catch {}
  }, []);

  // Internet connectivity detection
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Internet reconnected - game can resume");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("📡 Internet disconnected - pausing game");
      setIsOnline(false);
      // Pause the game when internet disconnects (but don't set matchEndTime)
      if (isPlaying) {
        setIsPlaying(false);
        aiChessService.cancelThinking();
        setIsThinking(false);
        setCurrentMoveStart(null);
        setCurrentThinkingAgent(null);
        setThinkingTime(0);
        // Clear timer state from localStorage when pausing (not ending)
        try {
          localStorage.removeItem("bb_matchElapsedSeconds");
        } catch {}
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isPlaying]);

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
    
    // Auto-restart if looping is enabled
    if (isLooping) {
      console.log("🔄 Auto-restarting match in 30 seconds... (Loop mode enabled)");
      const timeoutId = setTimeout(() => {
        console.log("🚀 Starting new match automatically (Loop mode)");
        resetGame();
        setIsPlaying(true);
        setMatchStart(Date.now());
        aiChessService.initializeMatch(3);
      }, 30000); // 30 second delay
      setLoopTimeoutId(timeoutId);
    } else {
      console.log("🏁 Game ended - Loop mode disabled, no auto-restart");
    }
    
    console.log("🏁 Game ended:", {
      result: gameResult,
      resultText: gameResult.result,
      timestamp: new Date().toISOString()
    });
  }, [matchElapsedSeconds, isLooping]);

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
            const minDurationMs = 5 * 60 * 1000; // Minimum 5 minutes
            
            // Allow checkmate if we've reached minimum duration (5 minutes)
            if (stats.elapsedTime >= minDurationMs) {
              const winner = newGame.turn() === 'w' ? 'black' : 'white';
              console.log(`🏆 Checkmate achieved after ${Math.floor(stats.elapsedTime/60000)}:${String(Math.floor((stats.elapsedTime%60000)/1000)).padStart(2,'0')} - ${winner} wins!`);
              handleGameEnd({
                winner,
                reason: 'checkmate',
                result: winner === 'white' ? '1-0' : '0-1'
              });
              return;
            } else {
              // Before minimum duration, continue playing (don't end on premature checkmate)
              console.log(`⏳ Checkmate detected before 5:00, continuing`);
            }
          }
          
          // Handle stalemate/draw: continue playing until 20-minute time limit (no early draws)
          if (newGame.isStalemate() || newGame.isDraw()) {
            const stats = aiChessService.getMatchStats();
            const maxDurationMs = 20 * 60 * 1000; // 20 minutes
            
            if (stats.elapsedTime >= maxDurationMs) {
              // Only at 20-minute time limit - adjudicate winner (draw only if points exactly equal)
              const adjudicated = determineWinnerByMaterial(newGame);
              console.log(`⏰ 20-minute time limit reached - adjudicating winner`);
              handleGameEnd(adjudicated);
              return;
            } else {
              // Before 20 minutes - continue playing (no draws allowed)
              console.log(`🔄 Draw/stalemate detected before 20:00 - continuing play for checkmate`);
              return;
            }
          }
        } else {
          console.error("❌ Failed to apply move:", move);
        }
      } else {
        console.log("⏳ No move returned (time limit or game end)");
        
        // Check if time limit reached - adjudicate winner when 20 minutes is reached
        const stats = aiChessService.getMatchStats();
        const maxDurationMs = 20 * 60 * 1000; // 20 minutes
        
        if (stats.elapsedTime >= maxDurationMs) {
          console.log(`⏰ 20-minute time limit reached - adjudicating winner`);
          const adjudicated = determineWinnerByMaterial(game);
          handleGameEnd(adjudicated);
          return;
        } else {
          console.log(`⏰ Time limit reached - continuing play for checkmate`);
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

  // Match clock: counts up from 0 to 20 minutes (1200 seconds) for countdown display
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
        const newTime = Math.min(prev + 1, 1200); // Always count up to 20 minutes (1200 seconds)
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

  // Hard cap at 20 minutes — adjudicate result (prefer wins; draws rare)
  useEffect(() => {
    if (!isPlaying) return;
    if (game.isCheckmate()) return;
    if (matchElapsedSeconds >= 1200) { // 20 minutes = 1200 seconds
      const res = determineWinnerByMaterial(game);
      handleGameEnd(res);
    }
  }, [isPlaying, matchElapsedSeconds, game, determineWinnerByMaterial, handleGameEnd]);

  /**
   * Toggle play/pause with proper state management
   */
  const togglePlayPause = () => {
    // Don't allow starting game when offline
    if (!isOnline && !isPlaying) {
      console.log("📡 Cannot start game - no internet connection");
      return;
    }

    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    if (newPlayingState) {
      // Resume: start match timer and initialize AI service
      setMatchStart(Date.now());
      if (matchElapsedSeconds === 0) {
        // Generate random game duration for fresh start
        const { duration, is20Min } = generateRandomGameDuration();
        setCurrentGameDuration(duration);
        setIs20MinMatch(is20Min);
        console.log(`🎲 Generated random game duration: ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')} ${is20Min ? '(20-min match - random winner)' : '(variable match - points-based winner)'}`);
      }
      aiChessService.initializeMatch(3); // Default difficulty 3
    } else {
      // Pause: stop thinking timer and clear current move immediately
      console.log("⏸️ Pausing game - stopping timer and AI moves immediately");
      aiChessService.cancelThinking(); // interrupt any in-flight delay immediately
      setIsThinking(false);
      setCurrentMoveStart(null);
      setCurrentThinkingAgent(null);
      setThinkingTime(0);
      // Clear timer state from localStorage when pausing (not ending)
      try {
        localStorage.removeItem("bb_matchElapsedSeconds");
      } catch {}
    }
    
    console.log("🎮 Game state changed:", {
      isPlaying: newPlayingState,
      agent1: agent1?.name,
      agent2: agent2?.name,
      currentGameDuration: currentGameDuration,
      isOnline: isOnline,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Toggle loop mode
   */
  const toggleLoop = () => {
    const newLoopingState = !isLooping;
    setIsLooping(newLoopingState);
    
    // Clear existing timeout if disabling loop
    if (!newLoopingState && loopTimeoutId) {
      clearTimeout(loopTimeoutId);
      setLoopTimeoutId(null);
      console.log("🛑 Loop disabled - auto-restart cancelled");
    } else if (newLoopingState) {
      console.log("🔄 Loop enabled - matches will auto-restart after natural game end");
    }
  };

  /**
   * Reset the game completely
   */
  const resetGame = () => {
    console.log("🔄 Manually resetting game:", {
      previousFen: game.fen(),
      previousHistory: game.history(),
      isLooping,
      timestamp: new Date().toISOString()
    });
    
    // Clear loop timeout if exists
    if (loopTimeoutId) {
      clearTimeout(loopTimeoutId);
      setLoopTimeoutId(null);
      console.log("🛑 Cleared existing loop timeout");
    }
    
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
    
    // Generate new random game duration for next game
    const { duration, is20Min } = generateRandomGameDuration();
    setCurrentGameDuration(duration);
    setIs20MinMatch(is20Min);
    console.log(`🎲 Reset: Generated new random game duration: ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')} ${is20Min ? '(20-min match - random winner)' : '(variable match - points-based winner)'}`);
    
    // Clear persisted timer state
    try {
      localStorage.removeItem("bb_matchElapsedSeconds");
      localStorage.removeItem("bb_matchEndTime");
    } catch {}
    
    // Reset AI service
    aiChessService.reset();
    
    console.log("✅ Game reset complete - Loop mode:", isLooping);
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
    isLooping,
    currentGameDuration,
    is20MinMatch,
    isOnline,
    matchLimitSeconds: MATCH_LIMIT_SECONDS,
    whitePoints: getMaterialPoints(game).whitePoints,
    blackPoints: getMaterialPoints(game).blackPoints,
    togglePlayPause,
    toggleLoop,
    resetGame,
    setDifficulty,
    matchStats: aiChessService.getMatchStats()
  };
};