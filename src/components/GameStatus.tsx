import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chess } from "chess.js";

interface GameStatusProps {
  game: Chess;
  moveTimes: Record<string, number[]>;
  currentMoveStart: number | null;
  currentThinkingAgent: string | null;
  isThinking: boolean;
}

export const GameStatus = ({ game, moveTimes, currentMoveStart, currentThinkingAgent, isThinking }: GameStatusProps) => {
  const history = game.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  
  // Calculate average move times
  const averageTimes = Object.entries(moveTimes).map(([agent, times]) => ({
    agent,
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    totalMoves: times.length,
    fastestMove: Math.min(...times),
    slowestMove: Math.max(...times)
  })).sort((a, b) => a.averageTime - b.averageTime);

  // Get current thinking time in seconds
  const currentThinkingTime = currentMoveStart ? (Date.now() - currentMoveStart) / 1000 : 0;

  return (
    <div className="space-y-4">
      {/* Current Game Status */}
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

          {isThinking && currentThinkingAgent && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Thinking:</span>
              <div className="text-right">
                <div className="text-sm text-blue-600 font-medium">
                  {currentThinkingAgent}
                </div>
                <div className="text-xs text-blue-500">
                  {currentThinkingTime.toFixed(1)}s
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

      {/* Speed Leaderboard */}
      {averageTimes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Speed Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {averageTimes.slice(0, 3).map((player, index) => (
                <div key={player.agent} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{player.agent}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Avg: {(player.averageTime / 1000).toFixed(1)}s
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {player.totalMoves} moves
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
