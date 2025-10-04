import { Chess, Square } from "chess.js";

interface ChessboardProps {
  game: Chess;
  boardWidth?: number;
}

const pieceSymbols: { [key: string]: string } = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

export const Chessboard = ({ game, boardWidth = 600 }: ChessboardProps) => {
  const board = game.board();
  const squareSize = boardWidth / 8;

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

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

                return (
                  <div
                    key={square}
                    className={`flex items-center justify-center ${
                      isLight ? "bg-board-light" : "bg-board-dark"
                    }`}
                    style={{
                      width: squareSize,
                      height: squareSize,
                      fontSize: squareSize * 0.65,
                    }}
                  >
                    {piece && (
                      <span
                        className={`select-none ${
                          piece.color === "w" ? "text-gray-900" : "text-gray-100"
                        }`}
                        style={{
                          textShadow:
                            piece.color === "w"
                              ? "0 0 2px rgba(0,0,0,0.3)"
                              : "0 0 2px rgba(0,0,0,0.8)",
                        }}
                      >
                        {pieceSymbols[`${piece.color}${piece.type}`]}
                      </span>
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
