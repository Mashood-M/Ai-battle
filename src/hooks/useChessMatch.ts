import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { Agent, MatchSpeed } from "@/types/chess";

export const useChessMatch = () => {
  const [game, setGame] = useState(new Chess());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<MatchSpeed>("normal");
  const [result, setResult] = useState<string | null>(null);

  const makeRandomMove = useCallback(() => {
    const moves = game.moves();
    if (moves.length === 0) {
      // Game over
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

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const newGame = new Chess(game.fen());
    newGame.move(randomMove);
    setGame(newGame);
  }, [game]);

  useEffect(() => {
    if (!isPlaying || result) return;

    const delays = {
      normal: 1000,
      fast: 300,
      instant: 50,
    };

    const timer = setTimeout(() => {
      makeRandomMove();
    }, delays[speed]);

    return () => clearTimeout(timer);
  }, [isPlaying, speed, result, makeRandomMove]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
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
    togglePlayPause,
    resetGame,
    cycleSpeed,
  };
};
