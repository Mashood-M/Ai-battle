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
  isPlaying: boolean;
  matchElapsedSeconds?: number;
  matchLimitSeconds?: number;
  currentGameDuration?: number;
  is20MinMatch?: boolean;
  isOnline?: boolean;
  matchEndTime?: number | null;
  whitePoints?: number;
  blackPoints?: number;
  whiteName?: string;
  blackName?: string;
}

export const GameStatus = ({ game, moveTimes, currentMoveStart, currentThinkingAgent, isThinking, thinkingTime, isPlaying, matchElapsedSeconds = 0, matchLimitSeconds = 1200, currentGameDuration, is20MinMatch, isOnline, matchEndTime, whitePoints, blackPoints, whiteName = 'White', blackName = 'Black' }: GameStatusProps) => {
  const history = game.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  
  const averageTimes = Object.entries(moveTimes).map(([agent, times]) => ({
    agent,
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    totalMoves: times.length
  })).sort((a, b) => a.averageTime - b.averageTime);

  const gameEnded = game.isCheckmate() || game.isStalemate() || game.isDraw();
  
  // Format timer display - always countdown from 20:00 to 0:00
  const formatTimer = () => {
    if (matchEndTime) {
      // Game actually ended - show final stopped time
      const minutes = Math.floor(matchElapsedSeconds / 60);
      const seconds = matchElapsedSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} (STOPPED)`;
    } else if (!isPlaying && matchElapsedSeconds > 0) {
      // Game paused/disconnected - show current stopped time
      const minutes = Math.floor(matchElapsedSeconds / 60);
      const seconds = matchElapsedSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      // Game running or not started - show countdown from 20:00 to 0:00
      const remainingSeconds = Math.max(0, 1200 - matchElapsedSeconds); // Always countdown from 20:00 (1200 seconds)
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Game Status</CardTitle>
            <div className="flex items-center gap-2">
              {isOnline === false && (
                <Badge variant="destructive" className="text-xs">
                  📡 Offline
                </Badge>
              )}
              {is20MinMatch && (
                <Badge variant="outline" className="text-xs">
                  20-Min Match
                </Badge>
              )}
              {!is20MinMatch && currentGameDuration && currentGameDuration < 1200 && (
                <Badge variant="outline" className="text-xs">
                  Variable Match
                </Badge>
              )}
              <div className="text-sm font-mono px-3 py-1 rounded bg-secondary text-foreground">
                {formatTimer()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Players row removed as requested */}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Turn:</span>
            <Badge variant={game.turn() === "w" ? "default" : "secondary"}>
              {game.turn() === "w" ? "White" : "Black"}
            </Badge>
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

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">White Points</span>
            <span className="text-sm font-mono">{(whitePoints ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Black Points</span>
            <span className="text-sm font-mono">{(blackPoints ?? 0)}</span>
          </div>
        </CardContent>
      </Card>

      {averageTimes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Move Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {averageTimes.map(({ agent, averageTime, totalMoves }) => {
                const side = agent === whiteName ? 'white' : agent === blackName ? 'black' : null;
                const dotClass = side === 'white' ? 'bg-board-light' : side === 'black' ? 'bg-board-dark' : 'bg-muted';
                return (
                  <div key={agent} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} />
                      <div className="text-sm font-medium">{agent}</div>
                      {side && (
                        <span className="text-xs text-muted-foreground">({side})</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground text-right">{totalMoves} moves</div>
                      <div className="text-sm font-mono">{(averageTime / 1000).toFixed(1)}s avg</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
