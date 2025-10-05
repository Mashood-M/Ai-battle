import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { Agent, MatchSpeed, ApiKeys } from "@/types/chess";
import { aiChessService } from "@/services/aiChessService";

export const useChessMatch = (agent1: Agent | null, agent2: Agent | null, apiKeys: ApiKeys) => {
  const [game, setGame] = useState(new Chess());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<MatchSpeed>("normal");
  const [result, setResult] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [moveTimes, setMoveTimes] = useState<Record<string, number[]>>({});
  const [currentMoveStart, setCurrentMoveStart] = useState<number | null>(null);
  const [currentThinkingAgent, setCurrentThinkingAgent] = useState<string | null>(null);
  const [gameStopReason, setGameStopReason] = useState<string | null>(null);

  const makeAiMove = useCallback(async () => {
    if (!agent1 || !agent2) return;

    const moves = game.moves();
    console.log("🔍 Game state check:", {
      availableMoves: moves.length,
      isCheckmate: game.isCheckmate(),
      isStalemate: game.isStalemate(),
      isDraw: game.isDraw(),
      isThreefoldRepetition: game.isThreefoldRepetition(),
      isInsufficientMaterial: game.isInsufficientMaterial(),
      turn: game.turn(),
      turnColor: game.turn() === "w" ? "WHITE" : "BLACK",
      timestamp: new Date().toISOString()
    });
    
    if (moves.length === 0) {
      let gameResult = "";
      if (game.isCheckmate()) {
        gameResult = game.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!";
      } else if (game.isStalemate()) {
        gameResult = "Draw by stalemate!";
      } else if (game.isDraw()) {
        // Check specific draw conditions
        if (game.isThreefoldRepetition()) {
          gameResult = "Draw by threefold repetition!";
        } else if (game.isInsufficientMaterial()) {
          gameResult = "Draw by insufficient material!";
        } else if (game.isDraw()) {
          gameResult = "Draw by 50-move rule!";
        } else {
          gameResult = "Draw!";
        }
      } else {
        // If no moves but not a recognized end condition, something is wrong
        console.warn("⚠️ No moves available but game not ended:", {
          isCheckmate: game.isCheckmate(),
          isStalemate: game.isStalemate(),
          isDraw: game.isDraw(),
          fen: game.fen()
        });
        return; // Don't end the game, let it continue
      }
      
      setResult(gameResult);
      console.log("🏁 Game ended:", { result: gameResult, timestamp: new Date().toISOString() });
      // Don't automatically stop the game - let user decide when to stop
      return;
    }

    setIsThinking(true);
    const currentAgent = game.turn() === "w" ? agent1 : agent2;
    const moveStartTime = Date.now();
    setCurrentMoveStart(moveStartTime);
    setCurrentThinkingAgent(currentAgent.name);
    
    console.log("🏁 Starting AI move calculation:", {
      currentAgent: currentAgent.name,
      agent1: agent1?.name,
      agent2: agent2?.name,
      turn: game.turn(),
      turnColor: game.turn() === "w" ? "WHITE" : "BLACK",
      moveNumber: Math.floor(game.history().length / 2) + 1,
      fen: game.fen(),
      timestamp: new Date().toISOString()
    });

    const move = await aiChessService.getMove(currentAgent, game, apiKeys);
    
    if (move) {
      const moveEndTime = Date.now();
      const moveDuration = moveEndTime - moveStartTime;
      
      // Record move time for this agent
      setMoveTimes(prev => ({
        ...prev,
        [currentAgent.name]: [...(prev[currentAgent.name] || []), moveDuration]
      }));
      
      const newGame = new Chess(game.fen());
      newGame.move(move);
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
    } else {
      console.log("❌ No move made:", {
        agent: currentAgent.name,
        reason: "AI returned null move",
        timestamp: new Date().toISOString()
      });
      
      // Stop the game with a reason
      const stopReason = `Game stopped: ${currentAgent.name} could not make a move (API issue or rate limit)`;
      setGameStopReason(stopReason);
      setIsPlaying(false);
      console.log("🛑 Game stopped:", { reason: stopReason, timestamp: new Date().toISOString() });
    }
    setIsThinking(false);
    setCurrentMoveStart(null);
    setCurrentThinkingAgent(null);
  }, [game, agent1, agent2, apiKeys]);

  useEffect(() => {
    if (!isPlaying || isThinking) return;

    const delays = {
      normal: 1000, // Reduced from 2000ms
      fast: 500,    // Reduced from 1000ms
      instant: 200, // Reduced from 500ms
    };

    const timer = setTimeout(() => {
      makeAiMove();
    }, delays[speed]);

    return () => clearTimeout(timer);
  }, [isPlaying, speed, isThinking, makeAiMove]); // Removed game.fen() to prevent excessive re-renders

  // Separate effect to trigger moves when game state changes
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

  const togglePlayPause = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    console.log("🎮 Game state changed:", {
      isPlaying: newPlayingState,
      agent1: agent1?.name,
      agent2: agent2?.name,
      timestamp: new Date().toISOString()
    });
  };

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
  };

  const cycleSpeed = () => {
    setSpeed((prev) => {
      if (prev === "normal") return "fast";
      if (prev === "fast") return "instant";
      return "normal";
    });
  };

  return {
    game,
    isPlaying,
    speed,
    result,
    isThinking,
    moveTimes,
    currentMoveStart,
    currentThinkingAgent,
    gameStopReason,
    togglePlayPause,
    resetGame,
    cycleSpeed,
  };
};
