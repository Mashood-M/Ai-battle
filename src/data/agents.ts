import { Agent } from "@/types/chess";

export const AGENTS: Agent[] = [
  {
    id: "deepseek-chat-v3.1",
    name: "DeepSeek Chat V3.1",
    type: "deepseek",
    version: "3.1",
    elo: 3500,
    wins: 0,
    losses: 0,
    draws: 0,
  },
  {
    id: "gpt-oss-20b",
    name: "GPT-OSS-20B",
    type: "grok",
    version: "20B",
    elo: 3500,
    wins: 0,
    losses: 0,
    draws: 0,
  },
  {
    id: "mistral-small-3.2",
    name: "Mistral Small 3.2",
    type: "claude",
    version: "3.2",
    elo: 3500,
    wins: 0,
    losses: 0,
    draws: 0,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    type: "gemini",
    version: "2.5",
    elo: 3500,
    wins: 0,
    losses: 0,
    draws: 0,
  },
];
