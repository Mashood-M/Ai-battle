import { Chess, Square } from "chess.js";

interface ChessboardProps {
  game: Chess;
  boardWidth?: number;
  showCoordinates?: boolean;
  highlightLastMove?: boolean;
}

const pieceSymbols: { [key: string]: string } = {
  // Use filled glyph set for BOTH sides; color will differentiate
  wp: "♟",
  wn: "♞",
  wb: "♝",
  wr: "♜",
  wq: "♛",
  wk: "♚",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

export const Chessboard = ({ 
  game, 
  boardWidth = 600, 
  showCoordinates = true, 
  highlightLastMove = true 
}: ChessboardProps) => {
  const board = game.board();
  const squareSize = boardWidth / 8;
  const history = game.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const isLastMoveSquare = (square: string) => {
    if (!highlightLastMove || !lastMove) return false;
    return square === lastMove.from || square === lastMove.to;
  };

  const isInCheck = (square: string) => {
    const piece = game.get(square as Square);
    if (!piece || piece.type !== 'k') return false;
    return game.isCheck();
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className="rounded-xl overflow-hidden shadow-2xl border border-border"
        style={{ width: boardWidth, height: boardWidth }}
      >
        <div className="relative" style={{ width: "100%", height: "100%" }}>
          {ranks.map((rank, rankIndex) => (
            <div key={rank} className="flex">
              {files.map((file, fileIndex) => {
                const isLight = (rankIndex + fileIndex) % 2 === 0;
                const square = `${file}${rank}` as Square;
                const piece = game.get(square);

                const isLastMove = isLastMoveSquare(square);
                const isCheck = isInCheck(square);
                
                return (
                  <div
                    key={square}
                    className={`relative flex items-center justify-center ${
                      isLight ? "bg-board-light" : "bg-board-dark"
                    } ${isCheck ? "ring-2 ring-red-500 ring-opacity-75" : ""}`}
                    style={{
                      width: squareSize,
                      height: squareSize,
                      fontSize: squareSize * 0.65,
                    }}
                  >
                    {isLastMove && (
                      <div className="absolute inset-0 bg-orange-500/40 pointer-events-none" />
                    )}
                    {piece && (
                      <span
                        className={"select-none"}
                        style={{
                          // Force fully opaque solid colors for both sides
                          color: piece.color === "b" ? "#000000" : "#FFFFFF",
                          textShadow: piece.color === "w" ? "0 0 2px rgba(0,0,0,0.85)" : "none",
                        }}
                      >
                        {pieceSymbols[`${piece.color}${piece.type}`]}
                      </span>
                    )}
                    
                    {/* Show coordinates */}
                    {showCoordinates && (
                      <div className="absolute top-0 left-0 text-xs text-muted-foreground opacity-50 pointer-events-none">
                        {square}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
