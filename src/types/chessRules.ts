export interface PieceRule {
  moves: string[];
  promotion?: string[];
  special?: string[];
}

export interface BoardRule {
  size: number;
  columns: string[];
  rows: number[];
}

export interface SpecialRule {
  conditions: string[];
}

export interface ChessRules {
  pieces: Record<string, PieceRule>;
  board: BoardRule;
  special_rules: Record<string, SpecialRule>;
}

export const chessRules: ChessRules = {
  pieces: {
    pawn: { moves: ["forward1", "forward2_if_start", "capture_diagonal", "en_passant"], promotion: ["queen", "rook", "bishop", "knight"] },
    rook: { moves: ["horizontal", "vertical"], special: ["castling"] },
    knight: { moves: ["L_shape"] },
    bishop: { moves: ["diagonal"] },
    queen: { moves: ["horizontal", "vertical", "diagonal"] },
    king: { moves: ["horizontal1", "vertical1", "diagonal1"], special: ["castling"] }
  },
  board: { size: 8, columns: ["a","b","c","d","e","f","g","h"], rows: [1,2,3,4,5,6,7,8] },
  special_rules: {
    castling: { conditions: ["king_and_rook_not_moved", "no_check_between", "no_check_on_king"] },
    en_passant: { conditions: ["pawn_moves_two_forward_previous_turn", "capture_diagonal"] },
    check: { conditions: ["king_attacked"] },
    checkmate: { conditions: ["king_in_check", "no_legal_moves"] },
    stalemate: { conditions: ["king_not_in_check", "no_legal_moves"] }
  }
};

export default chessRules;


