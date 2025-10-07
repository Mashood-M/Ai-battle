import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GameStatusProps {
  game: Chess;
  moveTimes: Record<string, number[]>;
  currentMoveStart: number | null;
  currentThinkingAgent: string | null;
  isThinking: boolean;
  thinkingTime: number;
}

export const GameStatus = ({ game, moveTimes, currentMoveStart, currentThinkingAgent, isThinking, thinkingTime }: GameStatusProps) => {
  const history = game.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  
  const averageTimes = Object.entries(moveTimes).map(([agent, times]) => ({
    agent,
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    totalMoves: times.length
  })).sort((a, b) => a.averageTime - b.averageTime);

  const gameEnded = game.isCheckmate() || game.isStalemate() || game.isDraw();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Turn:</span>
            <Badge variant={game.turn() === "w" ? "default" : "secondary"}>
              {game.turn() === "w" ? "White" : "Black"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Move Number:</span>
            <span className="text-sm">{Math.floor(game.history().length / 2) + 1}</span>
          </div>

          {lastMove && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Move:</span>
              <span className="text-sm font-mono">{lastMove.san}</span>
            </div>
          )}

          {isThinking && currentThinkingAgent && !gameEnded && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Thinking:</span>
              <div className="text-right">
                <div className="text-sm text-blue-600 font-medium">
                  {currentThinkingAgent}
                </div>
                <div className="text-xs text-blue-500">
                  {thinkingTime.toFixed(1)}s
                </div>
              </div>
            </div>
          )}

          {game.isCheck() && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant="destructive">Check!</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {averageTimes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Move Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {averageTimes.map(({ agent, averageTime, totalMoves }) => (
                <div key={agent} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{agent}</div>
                    <div className="text-xs text-muted-foreground">{totalMoves} moves</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">
                      {(averageTime / 1000).toFixed(1)}s avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
