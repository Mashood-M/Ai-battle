import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";

export class AiChessService {
  private async callDeepSeek(fen: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a chess engine. Given a FEN position, respond with ONLY the best move in standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O'). No explanation.",
          },
          {
            role: "user",
            content: `FEN: ${fen}\nWhat is your move?`,
          },
        ],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private async callGrok(fen: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          {
            role: "system",
            content: "You are a chess engine. Given a FEN position, respond with ONLY the best move in standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O'). No explanation.",
          },
          {
            role: "user",
            content: `FEN: ${fen}\nWhat is your move?`,
          },
        ],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private async callGemini(fen: string, apiKey: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a chess engine. Given this FEN position: ${fen}\n\nRespond with ONLY the best move in standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O'). No explanation.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    );
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  private async callClaude(fen: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: `You are a chess engine. Given this FEN position: ${fen}\n\nRespond with ONLY the best move in standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O'). No explanation.`,
          },
        ],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.content[0].text.trim();
  }

  private async callGPT5(fen: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a chess engine. Given a FEN position, respond with ONLY the best move in standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O'). No explanation.",
          },
          {
            role: "user",
            content: `FEN: ${fen}\nWhat is your move?`,
          },
        ],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async getMove(agent: Agent, game: Chess, apiKeys: ApiKeys): Promise<string | null> {
    const fen = game.fen();
    let apiKey: string | undefined;
    let moveText: string;

    try {
      switch (agent.type) {
        case "deepseek":
          apiKey = apiKeys.deepseek;
          if (!apiKey) throw new Error("DeepSeek API key not set");
          moveText = await this.callDeepSeek(fen, apiKey);
          break;
        case "grok":
          apiKey = apiKeys.grok;
          if (!apiKey) throw new Error("Grok API key not set");
          moveText = await this.callGrok(fen, apiKey);
          break;
        case "gemini":
          apiKey = apiKeys.gemini;
          if (!apiKey) throw new Error("Gemini API key not set");
          moveText = await this.callGemini(fen, apiKey);
          break;
        case "claude":
          apiKey = apiKeys.claude;
          if (!apiKey) throw new Error("Claude API key not set");
          moveText = await this.callClaude(fen, apiKey);
          break;
        case "gpt":
          apiKey = apiKeys.openai;
          if (!apiKey) throw new Error("OpenAI API key not set");
          moveText = await this.callGPT5(fen, apiKey);
          break;
        default:
          throw new Error(`Unknown agent type: ${agent.type}`);
      }

      // Clean up the move text
      moveText = moveText.replace(/['"`.]/g, "").trim();
      
      // Try to make the move
      const legalMoves = game.moves();
      const matchedMove = legalMoves.find(
        (m) => m.toLowerCase() === moveText.toLowerCase()
      );
      
      if (matchedMove) {
        return matchedMove;
      }

      // Fallback to random move if AI response invalid
      console.warn(`Invalid move from ${agent.name}: ${moveText}`);
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    } catch (error) {
      console.error(`Error getting move from ${agent.name}:`, error);
      // Fallback to random move on error
      const moves = game.moves();
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }
}

export const aiChessService = new AiChessService();
