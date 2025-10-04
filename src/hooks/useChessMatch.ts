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

  const makeAiMove = useCallback(async () => {
    if (!agent1 || !agent2) return;

    const moves = game.moves();
    if (moves.length === 0) {
      if (game.isCheckmate()) {
        setResult(game.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!");
      } else if (game.isDraw()) {
        setResult("Draw!");
      } else if (game.isStalemate()) {
        setResult("Draw by stalemate!");
      }
      setIsPlaying(false);
      return;
    }

    setIsThinking(true);
    const currentAgent = game.turn() === "w" ? agent1 : agent2;
    
    console.log("🏁 Starting AI move calculation:", {
      currentAgent: currentAgent.name,
      turn: game.turn(),
      moveNumber: Math.floor(game.history().length / 2) + 1,
      fen: game.fen(),
      timestamp: new Date().toISOString()
    });

    const move = await aiChessService.getMove(currentAgent, game, apiKeys);
    
    if (move) {
      const newGame = new Chess(game.fen());
      newGame.move(move);
      setGame(newGame);
      
      console.log("🎮 Move executed:", {
        agent: currentAgent.name,
        move,
        newFen: newGame.fen(),
        gameHistory: newGame.history(),
        timestamp: new Date().toISOString()
      });
    }
    setIsThinking(false);
  }, [game, agent1, agent2, apiKeys]);

  useEffect(() => {
    if (!isPlaying || result || isThinking) return;

    const delays = {
      normal: 2000,
      fast: 1000,
      instant: 500,
    };

    const timer = setTimeout(() => {
      makeAiMove();
    }, delays[speed]);

    return () => clearTimeout(timer);
  }, [isPlaying, speed, result, makeAiMove, isThinking]);

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
    togglePlayPause,
    resetGame,
    cycleSpeed,
  };
};
