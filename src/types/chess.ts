export interface Agent {
  id: string;
  name: string;
  type: "stockfish" | "leela" | "alphazero" | "komodo" | "houdini";
  version: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  avatar?: string;
}

export interface Match {
  id: string;
  agent1: Agent;
  agent2: Agent;
  moves: string[];
  result: "white" | "black" | "draw" | "ongoing";
  timestamp: Date;
  currentMoveIndex: number;
}

export type MatchSpeed = "normal" | "fast" | "instant";
