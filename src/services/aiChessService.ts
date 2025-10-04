import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";

export class AiChessService {
  private async callOpenRouter(fen: string, apiKey: string, model: string): Promise<string> {
    console.log("🤖 OpenRouter API Call:", {
      fen,
      model,
      apiKey: apiKey.substring(0, 10) + "...",
      timestamp: new Date().toISOString()
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
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

    console.log("📡 OpenRouter Response Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter API Error:", errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const move = data.choices[0].message.content.trim();
    
    console.log("✅ OpenRouter Response:", {
      model,
      rawResponse: data,
      extractedMove: move,
      timestamp: new Date().toISOString()
    });

    return move;
  }


  async getMove(agent: Agent, game: Chess, apiKeys: ApiKeys): Promise<string | null> {
    const fen = game.fen();
    let apiKey: string | undefined;
    let moveText: string;
    let model: string;

    console.log("🎯 Getting move for agent:", {
      agentName: agent.name,
      agentType: agent.type,
      fen,
      turn: game.turn(),
      legalMoves: game.moves(),
      apiKeys: Object.keys(apiKeys).reduce((acc, key) => {
        acc[key] = apiKeys[key as keyof ApiKeys] ? "***SET***" : "NOT SET";
        return acc;
      }, {} as Record<string, string>),
      timestamp: new Date().toISOString()
    });

    try {
      switch (agent.type) {
        case "deepseek":
          apiKey = apiKeys.deepseek;
          if (!apiKey) throw new Error("DeepSeek API key not set");
          model = "deepseek/deepseek-r1-0528-qwen3-8b:free";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "grok":
          apiKey = apiKeys.grok;
          if (!apiKey) throw new Error("Grok API key not set");
          model = "x-ai/grok-4-fast";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "gemini":
          apiKey = apiKeys.gemini;
          if (!apiKey) throw new Error("Gemini API key not set");
          model = "google/gemini-2.5-pro";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "claude":
          apiKey = apiKeys.claude;
          if (!apiKey) throw new Error("Claude API key not set");
          model = "anthropic/claude-sonnet-4.5";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "gpt":
          apiKey = apiKeys.openai;
          if (!apiKey) throw new Error("OpenAI API key not set");
          model = "openai/gpt-5";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        default:
          throw new Error(`Unknown agent type: ${agent.type}`);
      }

      // Clean up the move text
      const cleanedMove = moveText.replace(/['"`.]/g, "").trim();
      console.log("🧹 Move cleanup:", {
        originalMove: moveText,
        cleanedMove,
        agent: agent.name
      });
      
      // Try to make the move
      const legalMoves = game.moves();
      const matchedMove = legalMoves.find(
        (m) => m.toLowerCase() === cleanedMove.toLowerCase()
      );
      
      if (matchedMove) {
        console.log("✅ Valid move found:", {
          agent: agent.name,
          move: matchedMove,
          legalMoves,
          timestamp: new Date().toISOString()
        });
        return matchedMove;
      }

      // No valid move found from AI
      console.warn("⚠️ Invalid move from AI, no move will be made:", {
        agent: agent.name,
        aiResponse: cleanedMove,
        legalMoves,
        timestamp: new Date().toISOString()
      });
      return null;
    } catch (error) {
      console.error("❌ Error getting move from AI:", {
        agent: agent.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Check if it's an authentication error
      if (error.message.includes("401") || error.message.includes("Authentication") || error.message.includes("invalid")) {
        console.log("🔑 OpenRouter API Key Issue Detected!");
        console.log("💡 Please get a valid OpenRouter API key from: https://openrouter.ai/");
        console.log("📋 Supported models:");
        console.log("   - DeepSeek R1: deepseek/deepseek-r1-0528-qwen3-8b:free");
        console.log("   - Grok 4 Fast: x-ai/grok-4-fast");
        console.log("   - Gemini 2.5 Pro: google/gemini-2.5-pro");
        console.log("   - Claude Sonnet 4.5: anthropic/claude-sonnet-4.5");
        console.log("   - GPT-5: openai/gpt-5");
      }
      
      // No move will be made on error
      console.log("❌ No move will be made due to API error:", {
        agent: agent.name,
        error: error.message,
        availableMoves: game.moves()
      });
      return null;
    }
  }
}

export const aiChessService = new AiChessService();
