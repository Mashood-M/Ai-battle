import { Chess } from "chess.js";
import { Info, Crown, Shield, Zap, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chessRules } from "@/types/chessRules";
import { Badge } from "@/components/ui/badge";

interface ChessRulesProps {
  game: Chess;
}

export const ChessRules = ({ game }: ChessRulesProps) => {
  const history = game.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  const isInCheck = game.isCheck();
  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();

  const getSpecialMoveType = (move: any) => {
    if (move.flags.includes('k')) return 'Kingside Castling';
    if (move.flags.includes('q')) return 'Queenside Castling';
    if (move.flags.includes('e')) return 'En Passant';
    if (move.flags.includes('b') || move.flags.includes('n') || move.flags.includes('r') || move.flags.includes('q')) {
      return 'Pawn Promotion';
    }
    return null;
  };

  const getGameStatus = () => {
    if (isCheckmate) return { status: 'Checkmate', color: 'text-red-500', icon: Crown };
    if (isStalemate) return { status: 'Stalemate', color: 'text-yellow-500', icon: Shield };
    if (isDraw) return { status: 'Draw', color: 'text-gray-500', icon: Target };
    if (isInCheck) return { status: 'Check', color: 'text-orange-500', icon: Zap };
    return { status: 'In Progress', color: 'text-green-500', icon: Info };
  };

  const gameStatus = getGameStatus();
  const StatusIcon = gameStatus.icon;

  return (
    <div className="space-y-4">
      {/* Game Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <StatusIcon className="w-5 h-5" />
            Game Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={gameStatus.color}>
              {gameStatus.status}
            </Badge>
            {isInCheck && (
              <span className="text-sm text-muted-foreground">
                King is under attack!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Move */}
      {lastMove && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Last Move</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {lastMove.san}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {lastMove.color === 'w' ? 'White' : 'Black'}
                </span>
              </div>
              {getSpecialMoveType(lastMove) && (
                <Badge variant="outline" className="text-blue-600">
                  {getSpecialMoveType(lastMove)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chess Rules Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chess Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Objective:</strong> Checkmate the opponent's king
            </div>
            <div>
              <strong>Piece Movements:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                {Object.entries(chessRules.pieces).map(([piece, rule]) => (
                  <li key={piece}>
                    • <strong>{piece.charAt(0).toUpperCase() + piece.slice(1)}:</strong> {rule.moves.join(", ")}
                    {rule.special && rule.special.length > 0 && (
                      <span className="text-blue-600"> (Special: {rule.special.join(", ")})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Special Rules:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                {Object.entries(chessRules.special_rules).map(([rule, details]) => (
                  <li key={rule}>
                    • <strong>{rule.charAt(0).toUpperCase() + rule.slice(1).replace('_', ' ')}:</strong> {details.conditions.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
