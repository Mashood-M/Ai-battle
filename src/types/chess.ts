export interface Agent {
  id: string;
  name: string;
  type: "deepseek" | "grok" | "gemini" | "claude" | "gpt";
  version: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  avatar?: string;
}

export interface ApiKeys {
  deepseek?: string;
  grok?: string;
  gemini?: string;
  claude?: string;
  openai?: string;
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
