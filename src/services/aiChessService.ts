import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";

export interface GameResult {
  winner: 'white' | 'black' | null;
  reason: 'checkmate' | 'stalemate' | 'draw' | 'resignation';
  result: '1-0' | '0-1' | '1/2-1/2';
}

export class AiChessService {
  private matchDifficulty: number = 1; // 1-5 scale
  private moveCount: number = 0;
  private matchStartTime: number | null = null;
  // Removed strict time limit enforcement to allow full matches to checkmate
  private readonly maxGameDurationMs: number = 15 * 60 * 1000; // kept for stats only

  // Delay system configuration (tiered adaptive delays)
  // Target ranges per request
  private readonly earlyMoveMinDelay = 3000;   // moves 1-6: 3s - 5s
  private readonly earlyMoveMaxDelay = 5000;
  private readonly midMoveMinDelay = 6000;     // moves 7-25: 6s - 9s
  private readonly midMoveMaxDelay = 9000;
  private readonly lateMoveMinDelay = 8000;    // moves 26+: 8s - 12s
  private readonly lateMoveMaxDelay = 12000;

  /**
   * Calculate delay based on move number using tiered adaptive system
   * - 1–6  → 5–10s
   * - 7–25 → 10–15s
   * - 26+  → 15–25s
   */
  private calculateDelay(): number {
    const moveNumber = this.moveCount + 1;
    if (moveNumber <= 6) {
      return Math.floor(Math.random() * (this.earlyMoveMaxDelay - this.earlyMoveMinDelay + 1)) + this.earlyMoveMinDelay;
    }
    if (moveNumber <= 25) {
      return Math.floor(Math.random() * (this.midMoveMaxDelay - this.midMoveMinDelay + 1)) + this.midMoveMinDelay;
    }
    return Math.floor(Math.random() * (this.lateMoveMaxDelay - this.lateMoveMinDelay + 1)) + this.lateMoveMinDelay;
  }

  /**
   * Prefer active moves to avoid drawish states: captures or pawn moves if available
   */
  private pickActiveMove(legalMoves: string[], verboseMoves: ReturnType<Chess["moves"]> extends Array<infer T> ? any[] : any[]): string {
    // Try captures first
    const captureIdx: number[] = [];
    const pawnIdx: number[] = [];
    verboseMoves.forEach((m: any, idx: number) => {
      if (m.flags && typeof m.flags === 'string' && m.flags.includes('c')) captureIdx.push(idx);
      if (m.piece === 'p') pawnIdx.push(idx);
    });
    const choose = (indices: number[]) => indices[Math.floor(Math.random() * indices.length)];
    if (captureIdx.length > 0) return legalMoves[choose(captureIdx)];
    if (pawnIdx.length > 0) return legalMoves[choose(pawnIdx)];
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  /**
   * Generate a legal move with small personality/randomness and draw-avoidance bias
   */
  private generateRandomMove(game: Chess, _agent: Agent): string | null {
    const legalMoves = game.moves();
    if (legalMoves.length === 0) return null;

    // Use verbose to detect captures/pawns to bias away from quick draws
    const verbose = game.moves({ verbose: true }) as any[];

    // If repetition likely, prefer active moves to break cycles
    if (game.isThreefoldRepetition()) {
      return this.pickActiveMove(legalMoves, verbose);
    }

    // AI Personality: pick from top-3 randomly if many options, otherwise active bias
    if (legalMoves.length > 3) {
      const topMoves = legalMoves.slice(0, 3);
      return topMoves[Math.floor(Math.random() * topMoves.length)];
    }
    return this.pickActiveMove(legalMoves, verbose);
  }

  /**
   * Only report game end on checkmate (ignore draws/stalemates to continue play)
   */
  private checkGameEnd(game: Chess): GameResult | null {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'black' : 'white';
      return {
        winner,
        reason: 'checkmate',
        result: winner === 'white' ? '1-0' : '0-1'
      };
    }
    return null;
  }

  /**
   * Initialize match with random seed for variety
   */
  public initializeMatch(difficulty: number = 1): void {
    this.matchDifficulty = Math.max(1, Math.min(5, difficulty));
    this.moveCount = 0;
    this.matchStartTime = Date.now();
    
    console.log("🎲 Match initialized:", {
      difficulty: this.matchDifficulty,
      startTime: new Date(this.matchStartTime).toISOString(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get the next move for an agent
   */
  async getMove(agent: Agent, game: Chess, _apiKeys: ApiKeys): Promise<string | null> {
    // Check if game is already over
    const gameResult = this.checkGameEnd(game);
    if (gameResult) {
      console.log("🏁 Game already ended:", gameResult);
      return null;
    }

    // Do not stop early due to time limit; allow full games to checkmate

    // Calculate delay for this move
    const delay = this.calculateDelay();
    
    console.log("🤔 AI thinking:", {
      agent: agent.name,
      moveNumber: this.moveCount + 1,
      difficulty: this.matchDifficulty,
      delayMs: delay,
      legalMoves: game.moves().length,
      timestamp: new Date().toISOString()
    });

    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate random legal move
    const move = this.generateRandomMove(game, agent);
    
    if (move) {
      this.moveCount++;
      
      console.log("🎯 Move selected:", {
        agent: agent.name,
        move,
        moveNumber: this.moveCount,
        delayMs: delay,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log("❌ No legal moves available");
    }
      
      return move;
  }

  /**
   * Run a full automatic match loop until the game ends.
   * Calls optional updateUI with current FEN after each applied move.
   */
  public async runAutoMatch(
    white: Agent,
    black: Agent,
    updateUI?: (fen: string) => void,
    _apiKeys?: ApiKeys
  ): Promise<{ winner: 'White' | 'Black' | 'Draw'; moves: string[]; totalMoves: number }> {
    const chess = new Chess();
    this.reset();
    this.initializeMatch(this.matchDifficulty);

    while (!chess.isCheckmate()) {
      // Determine current agent
      const agent = chess.turn() === 'w' ? white : black;
      // Wait adaptive delay per move
      const delay = this.calculateDelay();
      await new Promise((res) => setTimeout(res, delay));

      // Generate and play a legal move
      const legalMoves = chess.moves();
      if (legalMoves.length === 0) break;
      // Bias away from draws if possible
      const verbose = chess.moves({ verbose: true }) as any[];
      let pick = this.pickActiveMove(legalMoves, verbose);
      chess.move(pick);
      this.moveCount += 1;

      if (updateUI) updateUI(chess.fen());
    }

    // Determine result
    let winner: 'White' | 'Black' | 'Draw' = 'Draw';
    if (chess.isCheckmate()) {
      // If it's checkmate, the side to move has no legal moves and is in check, so the previous mover wins
      winner = chess.turn() === 'w' ? 'Black' : 'White';
    }

    const history = chess.history();
    return { winner, moves: history, totalMoves: history.length };
  }

  /**
   * Check if the game is over and return the result
   */
  public getGameResult(game: Chess): GameResult | null {
    return this.checkGameEnd(game);
  }

  /**
   * Get current match statistics
   */
  public getMatchStats() {
    return {
      moveCount: this.moveCount,
      difficulty: this.matchDifficulty,
      elapsedTime: this.matchStartTime ? Date.now() - this.matchStartTime : 0,
      timeRemaining: this.matchStartTime ? Math.max(0, this.maxGameDurationMs - (Date.now() - this.matchStartTime)) : 0
    };
  }

  /**
   * Reset the service for a new match
   */
  public reset(): void {
    this.moveCount = 0;
    this.matchStartTime = null;
    this.matchDifficulty = 1;
    
    console.log("🔄 AI Chess Service reset");
  }

  /**
   * Set match difficulty (1-5 scale)
   */
  public setDifficulty(difficulty: number): void {
    this.matchDifficulty = Math.max(1, Math.min(5, difficulty));
    console.log("⚙️ Difficulty set to:", this.matchDifficulty);
  }

  /**
   * Get current difficulty level
   */
  public getDifficulty(): number {
    return this.matchDifficulty;
  }
}

// Export singleton instance
export const aiChessService = new AiChessService();