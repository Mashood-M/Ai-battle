import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";

export class AiChessService {
  private rateLimitExceeded = false;
  private rateLimitResetTime: number | null = null;
  private lastOpenRouterKey: string | null = null;

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`API call timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
  private async callOpenRouter(fen: string, apiKey: string, model: string, retryCount: number = 0): Promise<string> {
    // Sanitize API key in case .env values include quotes
    const sanitizedKey = (apiKey || "").trim().replace(/^['"]+|['"]+$/g, "");

    console.log("🤖 OpenRouter API Call:", {
      fen,
      model,
      apiKey: sanitizedKey.substring(0, 10) + "...",
      timestamp: new Date().toISOString()
    });

    const response = await this.withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      referrer: typeof window !== 'undefined' ? window.location.origin : undefined,
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sanitizedKey}`,
        // OpenRouter recommends setting a referer or title
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "bot-battles",
        "X-Title": "Bot Battles Live",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a chess engine. Give ONLY the move in algebraic notation. Examples: e4, Nf3, O-O, exd5. No words, just the move.`,
          },
          {
            role: "user",
            content: `FEN: ${fen}\n\nBest move:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    }), 15000);

    console.log("📡 OpenRouter Response Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter API Error:", errorText);
      
      // Check for rate limit headers
      const headerReset = response.headers.get('X-RateLimit-Reset') || response.headers.get('x-ratelimit-reset');
      const retryAfter = response.headers.get('Retry-After') || response.headers.get('retry-after');
      if (headerReset && !Number.isNaN(parseInt(headerReset))) {
        // Header is unix seconds
        this.rateLimitResetTime = parseInt(headerReset) * 1000;
      } else if (retryAfter && !Number.isNaN(parseInt(retryAfter))) {
        // Retry-After is delta seconds
        this.rateLimitResetTime = Date.now() + parseInt(retryAfter) * 1000;
      }
      if (response.status === 429) {
        this.rateLimitExceeded = true;
      }
      
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    let data;
    try {
      const responseText = await response.text();
      if (!responseText.trim()) {
        console.error("❌ Empty response from OpenRouter API");
        throw new Error("Empty response from OpenRouter API");
      }
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("❌ JSON Parse Error:", error);
      throw new Error(`Invalid JSON response from OpenRouter API: ${error.message}`);
    }
    
    // Validate OpenRouter response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error("❌ Invalid OpenRouter response structure:", data);
      throw new Error("Invalid response structure from OpenRouter API");
    }
    
    const choice = data.choices[0];
    if (!choice.message || !choice.message.content) {
      console.error("❌ Invalid OpenRouter choice structure:", choice);
      throw new Error("Invalid choice structure from OpenRouter API");
    }
    
    const move = choice.message.content.trim();
    
    // Handle finish_reason: 'length' - response was truncated
    if (choice.finish_reason === 'length') {
      console.warn("⚠️ Response truncated due to max_tokens limit:", {
        finish_reason: choice.finish_reason,
        content: choice.message.content,
        move: move
      });
      
      // Try to extract a valid move even from truncated response
      if (move && move.length >= 2) {
        console.log("✅ Using truncated response as move:", move);
      } else {
        console.error("❌ Truncated response too short to be a valid move:", {
          move,
          finish_reason: choice.finish_reason,
          content: choice.message.content
        });
        throw new Error("Response truncated and too short to be a valid move");
      }
    }
    
    // If move is empty or too short, it might be truncated
    if (!move || move.length < 2) {
      console.error("❌ Empty or too short move from OpenRouter:", {
        move,
        finish_reason: choice.finish_reason,
        content: choice.message.content
      });
      throw new Error("Empty or invalid move from OpenRouter API");
    }
    
    console.log("✅ OpenRouter Response:", {
      model,
      finish_reason: choice.finish_reason,
      content: choice.message.content,
      extractedMove: move,
      moveLength: move.length,
      timestamp: new Date().toISOString()
    });

    // Success: clear any prior rate-limit flags
    this.rateLimitExceeded = false;
    this.rateLimitResetTime = null;
    return move;
  }

  private async callOpenRouterWithRetry(fen: string, apiKey: string, model: string): Promise<string> {
    try {
      return await this.callOpenRouter(fen, apiKey, model, 0);
    } catch (error) {
      console.warn("⚠️ First attempt failed, trying with simpler prompt:", error);
      
      // Try with an even simpler prompt
      const response = await this.withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        referrer: typeof window !== 'undefined' ? window.location.origin : undefined,
        referrerPolicy: 'strict-origin-when-cross-origin',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "bot-battles",
          "X-Title": "Bot Battles Live",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: `Chess position: ${fen}. What's the best move? Answer with just the move like "e4" or "Nf3".`,
            },
          ],
          temperature: 0.1,
          max_tokens: 20,
        }),
      }), 15000);

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const move = data.choices[0].message.content.trim();
      
      console.log("✅ OpenRouter Retry Response:", {
        model,
        move,
        timestamp: new Date().toISOString()
      });
      
      return move;
    }
  }

  private async callGoogleGemini(fen: string, apiKey: string): Promise<string> {
    console.log("🤖 Google Gemini API Call:", {
      fen,
      apiKey: apiKey.substring(0, 10) + "...",
      timestamp: new Date().toISOString()
    });

    const env = (import.meta as any).env || {};
    const geminiModel = env.VITE_GEMINI_MODEL || "gemini-2.5-pro";

    const response = await this.withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
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
                  text: `You are a chess engine. Give ONLY the move in algebraic notation. Examples: e4, Nf3, O-O, exd5. No words, just the move.

FEN: ${fen}
Best move:`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 20,
          },
        }),
      }
    ), 15000);

    console.log("📡 Google Gemini Response Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Google Gemini API Error:", errorText);
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    const candidate = result?.candidates?.[0];

    if (!candidate) {
      console.error("❌ No candidates returned from Gemini:", result);
      throw new Error("No candidates returned from Gemini API");
    }

    if (candidate.finishReason === "MAX_TOKENS") {
      console.error("⚠️ Gemini stopped early due to MAX_TOKENS:", candidate);
      // Try to still extract partial move if present
    }

    let moveText = "";

    try {
      if (Array.isArray(candidate.content)) {
        // Normal structure (expected)
        moveText = candidate.content[0]?.parts?.[0]?.text?.trim() || "";
      } else if (candidate.content?.parts) {
        // Alternate structure (some Gemini responses use this)
        moveText = candidate.content.parts?.[0]?.text?.trim() || "";
      }
    } catch (err) {
      console.error("⚠️ Parsing error:", err);
      throw new Error(`Gemini parsing error: ${err.message}`);
    }

    if (!moveText) {
      console.error("❌ Invalid Gemini candidate structure:", candidate);
      throw new Error("Invalid candidate structure from Gemini API");
    }

    console.log("✅ Google Gemini Response:", {
      finishReason: candidate.finishReason,
      extractedMove: moveText,
      timestamp: new Date().toISOString()
    });

    return moveText;
  }

  private getOpenRouterModel(agentType: Agent["type"]): string {
    const env = (import.meta as any).env || {};
    if (agentType === "deepseek") return env.VITE_MODEL_DEEPSEEK || "deepseek/deepseek-chat-v3.1:free";
    if (agentType === "gptoss") return env.VITE_MODEL_GPTOSS || "openai/gpt-oss-20b:free";
    if (agentType === "mistral") return env.VITE_MODEL_MISTRAL || "mistralai/mistral-small-3.2-24b-instruct:free";
    return "";
  }

  private shouldSkipApiCall(agent: Agent): boolean {
    // Do not globally block; always attempt calls.
    if (this.rateLimitExceeded && this.rateLimitResetTime && Date.now() >= this.rateLimitResetTime) {
      this.resetRateLimitStatus();
    }
    return false;
  }


  async getMove(agent: Agent, game: Chess, apiKeys: ApiKeys): Promise<string | null> {
    const fen = game.fen();
    let apiKey: string | undefined;
    let moveText: string;
    let model: string;

    // If OpenRouter key changed, clear any prior rate-limit state
    if (apiKeys.openrouter && apiKeys.openrouter !== this.lastOpenRouterKey) {
      this.lastOpenRouterKey = apiKeys.openrouter;
      this.resetRateLimitStatus();
    }

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

    // Check if we should skip API call due to rate limits
    if (this.shouldSkipApiCall(agent)) {
      console.log("⏸️ Skipping API call due to rate limit:", {
        agent: agent.name,
        reason: "Rate limit exceeded, no move will be made"
      });
      return null;
    }

    try {
      switch (agent.type) {
        case "deepseek":
          apiKey = apiKeys.openrouter;
          if (!apiKey) throw new Error("OpenRouter API key not set");
          model = this.getOpenRouterModel("deepseek");
          moveText = await this.callOpenRouterWithRetry(fen, apiKey, model);
          break;
        case "gptoss":
          apiKey = apiKeys.openrouter;
          if (!apiKey) throw new Error("OpenRouter API key not set");
          model = this.getOpenRouterModel("gptoss");
          moveText = await this.callOpenRouterWithRetry(fen, apiKey, model);
          break;
        case "mistral":
          apiKey = apiKeys.openrouter;
          if (!apiKey) throw new Error("OpenRouter API key not set");
          model = this.getOpenRouterModel("mistral");
          moveText = await this.callOpenRouterWithRetry(fen, apiKey, model);
          break;
        case "gemini":
          apiKey = apiKeys.gemini;
          if (!apiKey) throw new Error("Google Gemini API key not set");
          moveText = await this.callGoogleGemini(fen, apiKey);
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
      const message = (error as Error).message || String(error);
      console.error("❌ Error getting move from AI:", {
        agent: agent.name,
        error: message,
        timestamp: new Date().toISOString()
      });

      // Mark rate limit only on HTTP 429
      if (message.includes("429") || message.includes("Rate limit exceeded") || message.includes("Too Many Requests")) {
        this.rateLimitExceeded = true;
        return null;
      }

      // For all other errors, do not claim rate limit. Just stop this move.
      return null;
    }
  }

  // Method to reset rate limit status (can be called when limits reset)
  resetRateLimitStatus(): void {
    this.rateLimitExceeded = false;
    this.rateLimitResetTime = null;
    console.log("🔄 Rate limit status reset - API calls will resume");
  }

  // Method to check rate limit status
  getRateLimitStatus(): { exceeded: boolean; resetTime: number | null } {
    return {
      exceeded: this.rateLimitExceeded,
      resetTime: this.rateLimitResetTime
    };
  }
}

export const aiChessService = new AiChessService();
