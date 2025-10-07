export interface Agent {
  id: string;
  name: string;
  type: "deepseek" | "gptoss" | "mistral" | "gemini";
  version: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  avatar?: string;
}

export interface ApiKeys {
  openrouter?: string; // used for DeepSeek, GPT-OSS-20B, Mistral (via OpenRouter)
  gemini?: string; // Google AI Studio key
}

export interface ChessMove {
  san: string;
  uci: string | null;
}

export interface ChessMatch {
  opening: string;
  result: string;
  moves: ChessMove[];
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
