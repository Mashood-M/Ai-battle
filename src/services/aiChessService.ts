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
  private readonly maxGameDurationMs: number = 20 * 60 * 1000; // kept for stats only
  private readonly minAggressionTimeMs: number = 2 * 60 * 1000; // Start aggression very early (2 minutes)
  private readonly minCheckmateTimeMs: number = 3 * 60 * 1000; // Allow checkmate after 3 minutes for natural endings
  private lastOpeningFirstSan: string | null = null;
  private openingAvoidSet: Set<string> = new Set();

  // Delay system configuration (tiered adaptive delays)
  // Target ranges per request
  private readonly earlyMoveMinDelay = 3000;   // moves 1-6: 3s - 5s
  private readonly earlyMoveMaxDelay = 5000;
  private readonly midMoveMinDelay = 6000;     // moves 7-25: 6s - 9s
  private readonly midMoveMaxDelay = 9000;
  private readonly lateMoveMinDelay = 8000;    // moves 26+: 8s - 12s
  private readonly lateMoveMaxDelay = 12000;

  // Cancellation support to stop immediately when paused
  private pendingCancel: (() => void) | null = null;

  /**
   * Calculate delay based on move number and time remaining
   * - Faster play when time is running out to achieve checkmate
   * - 1–6  → 3–5s
   * - 7–25 → 6–9s  
   * - 26+  → 8–12s
   * - Time pressure → 1–3s
   */
  private calculateDelay(): number {
    const moveNumber = this.moveCount + 1;
    const elapsed = this.matchStartTime ? Date.now() - this.matchStartTime : 0;
    const timeRemaining = this.maxGameDurationMs - elapsed;
    
    // Play much faster when time is running out
    if (timeRemaining < 5 * 60 * 1000) { // Last 5 minutes
      return Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    }
    
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
   * Generate a legal move with aggressive checkmate-seeking strategy:
   * 1) Mate-in-1 if available
   * 2) Any checking move
   * 3) Captures (prioritize high-value pieces)
   * 4) Pawn pushes (advance pawns)
   * 5) Avoid drawish moves
   */
  private generateRandomMove(game: Chess, _agent: Agent): string | null {
    const legalMoves = game.moves();
    if (legalMoves.length === 0) return null;

    const verbose = game.moves({ verbose: true }) as any[];
    const elapsed = this.matchStartTime ? Date.now() - this.matchStartTime : 0;
    const aggressive = elapsed >= this.minAggressionTimeMs || this.moveCount >= 4; // Start aggression even earlier

    // Helper to ensure we don't deliver mate before minCheckmateTimeMs
    const isPrematureMate = (san: string): boolean => {
      if (elapsed >= this.minCheckmateTimeMs) return false;
      const probe = new Chess(game.fen());
      try { probe.move(san); } catch { return false; }
      return probe.isCheckmate();
    };

    const pickFirstNonMating = (candidates: any[]): string | null => {
      for (const mv of candidates) {
        const san = typeof mv === 'string' ? mv : mv.san;
        if (!isPrematureMate(san)) return san;
      }
      return null;
    };

    // Add some randomness to make games more balanced and unpredictable
    const randomFactor = Math.random();
    
    if (aggressive) {
      // 1) Mate-in-1 search (highest priority) - but only after minimum time
      if (elapsed >= this.minCheckmateTimeMs) {
        for (const mv of verbose) {
          const probe = new Chess(game.fen());
          probe.move(mv.san);
          if (probe.isCheckmate()) {
            console.log("🎯 Mate-in-1 found:", mv.san);
            return mv.san as string;
          }
        }
      }

      // 2) Any checking move (with higher chance for more aggressive play)
      const checks = verbose.filter((m: any) => typeof m.san === 'string' && m.san.includes('+'));
      if (checks.length > 0 && randomFactor < 0.8) { // 80% chance to play check (increased from 70%)
        const san = pickFirstNonMating(checks);
        if (san) {
          console.log("⚡ Checking move selected");
          return san as string;
        }
      }
    }

    // 3) Prioritize captures by piece value
    const captures = verbose.filter((m: any) => m.flags && m.flags.includes('c'));
    if (captures.length > 0) {
      // Sort captures by captured piece value
      const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
      const sortedCaptures = captures.sort((a, b) => {
        const aValue = pieceValues[a.captured as keyof typeof pieceValues] || 0;
        const bValue = pieceValues[b.captured as keyof typeof pieceValues] || 0;
        return bValue - aValue; // Higher value first
      });
      
      // Pick from top 3 highest value captures
      const topCaptures = sortedCaptures.slice(0, Math.min(3, sortedCaptures.length));
      const san = pickFirstNonMating(topCaptures);
      if (san) {
        console.log("💥 High-value capture:", san);
        return san as string;
      }
    }

    // 4) Pawn pushes (advance pawns for promotion chances)
    const pawnMoves = verbose.filter((m: any) => m.piece === 'p');
    if (pawnMoves.length > 0) {
      // Prioritize pawn moves that advance furthest
      const sortedPawns = pawnMoves.sort((a, b) => {
        const aRank = parseInt(a.to[1]);
        const bRank = parseInt(b.to[1]);
        return bRank - aRank; // Higher rank first
      });
      
      const topPawns = sortedPawns.slice(0, Math.min(2, sortedPawns.length));
      const san = pickFirstNonMating(topPawns);
      if (san) {
        console.log("♟️ Pawn advance:", san);
        return san as string;
      }
    }

    // 5) Avoid drawish moves - prefer active moves
    const activeMove = this.pickActiveMove(legalMoves, verbose);
    if (activeMove && !isPrematureMate(activeMove)) {
      console.log("🎯 Active move:", activeMove);
      return activeMove;
    }

    // 6) Fallback - avoid repetition draws
    if (game.isThreefoldRepetition()) {
      const nonRepeatingMoves = legalMoves.filter(move => {
        const testGame = new Chess(game.fen());
        testGame.move(move);
        return !testGame.isThreefoldRepetition();
      });
      if (nonRepeatingMoves.length > 0) {
        const san = pickFirstNonMating(nonRepeatingMoves);
        if (san) return san as string;
      }
    }

    // 7) Final fallback - pick first non-mating legal move if under threshold
    const nonMating = legalMoves.filter((m) => !isPrematureMate(m));
    if (nonMating.length > 0) return nonMating[Math.floor(Math.random() * nonMating.length)];
    // If all moves mate (very rare), just return any legal move
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
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
    if (this.lastOpeningFirstSan) this.openingAvoidSet.add(this.lastOpeningFirstSan);
    if (this.openingAvoidSet.size > 8) {
      this.openingAvoidSet = new Set(Array.from(this.openingAvoidSet).slice(-8));
    }
    
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

    // Wait for the calculated delay, but allow cancellation to interrupt
    const cancelPromise = new Promise<void>((resolve) => {
      this.pendingCancel = () => resolve();
    });
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, delay)),
      cancelPromise,
    ]);

    // If canceled, return null immediately
    if (this.pendingCancel === null) {
      // canceled already consumed
      return null;
    }
    // clear cancel hook for next move
    this.pendingCancel = null;

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

    const startMs = Date.now();
    while (!chess.isCheckmate()) {
      // Determine current agent
      const agent = chess.turn() === 'w' ? white : black;
      // Wait adaptive delay per move
      const delay = this.calculateDelay();
      await new Promise((res) => setTimeout(res, delay));

      // Do not hard-stop by time; we aim to finish by checkmate

      // Generate and play a legal move
      const legalMoves = chess.moves();
      if (legalMoves.length === 0) break;
      // Bias away from draws if possible
      const verbose = chess.moves({ verbose: true }) as any[];
      let pick = this.pickActiveMove(legalMoves, verbose);
      if (this.moveCount === 0 && this.openingAvoidSet.size > 0 && legalMoves.length > 1) {
        const filtered = legalMoves.filter((m) => !this.openingAvoidSet.has(m));
        if (filtered.length > 0) pick = filtered[Math.floor(Math.random() * filtered.length)];
      }
      chess.move(pick);
      this.moveCount += 1;
      if (this.moveCount === 1) this.lastOpeningFirstSan = pick;

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

  // External cancel to stop thinking delay immediately
  public cancelThinking(): void {
    if (this.pendingCancel) {
      const fn = this.pendingCancel;
      this.pendingCancel = null;
      try { fn(); } catch {}
    }
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