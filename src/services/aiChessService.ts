import { Chess } from "chess.js";
import { Agent, ApiKeys } from "@/types/chess";

export class AiChessService {
  private rateLimitExceeded = false;
  private rateLimitResetTime: number | null = null;
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
            content: `You are a professional chess engine that strictly follows the complete rules of chess. You must respond with ONLY the best legal move in standard algebraic notation.

CHESS RULES YOU MUST FOLLOW:
1. OBJECTIVE: Checkmate the opponent's king
2. PIECE MOVEMENTS:
   - King: One square in any direction (cannot move into check)
   - Queen: Any number of squares in any direction
   - Rook: Any number of squares vertically or horizontally
   - Bishop: Any number of squares diagonally
   - Knight: L-shape (2+1 squares), can jump over pieces
   - Pawn: Forward 1 square (2 on first move), captures diagonally

3. SPECIAL RULES:
   - Castling: King moves 2 squares toward rook, rook moves next to king (O-O for kingside, O-O-O for queenside)
   - En passant: Capture pawn that moved 2 squares as if it moved 1
   - Pawn promotion: Must promote to Queen, Rook, Bishop, or Knight when reaching 8th rank
   - Check: King under attack, must respond immediately
   - Checkmate: King in check with no legal moves = game over
   - Stalemate: King not in check but no legal moves = draw

4. ILLEGAL MOVES: Never move into check or make illegal moves
5. NOTATION: Use standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O', 'O-O-O', 'exd5', 'Qh5+', 'Nxf7#')

Respond with ONLY the move in algebraic notation. No explanations or analysis.`,
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
      
      // Check for rate limit headers
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      if (rateLimitReset) {
        this.rateLimitResetTime = parseInt(rateLimitReset) * 1000; // Convert to milliseconds
      }
      
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error("❌ JSON Parse Error:", error);
      throw new Error(`Invalid JSON response from OpenRouter API: ${error.message}`);
    }
    
    const move = data.choices[0].message.content.trim();
    
    console.log("✅ OpenRouter Response:", {
      model,
      rawResponse: data,
      extractedMove: move,
      timestamp: new Date().toISOString()
    });

    return move;
  }

  private async callGoogleGemini(fen: string, apiKey: string): Promise<string> {
    console.log("🤖 Google Gemini API Call:", {
      fen,
      apiKey: apiKey.substring(0, 10) + "...",
      timestamp: new Date().toISOString()
    });

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
                  text: `You are a professional chess engine that strictly follows the complete rules of chess. You must respond with ONLY the best legal move in standard algebraic notation.

CHESS RULES YOU MUST FOLLOW:
1. OBJECTIVE: Checkmate the opponent's king
2. PIECE MOVEMENTS:
   - King: One square in any direction (cannot move into check)
   - Queen: Any number of squares in any direction
   - Rook: Any number of squares vertically or horizontally
   - Bishop: Any number of squares diagonally
   - Knight: L-shape (2+1 squares), can jump over pieces
   - Pawn: Forward 1 square (2 on first move), captures diagonally

3. SPECIAL RULES:
   - Castling: King moves 2 squares toward rook, rook moves next to king (O-O for kingside, O-O-O for queenside)
   - En passant: Capture pawn that moved 2 squares as if it moved 1
   - Pawn promotion: Must promote to Queen, Rook, Bishop, or Knight when reaching 8th rank
   - Check: King under attack, must respond immediately
   - Checkmate: King in check with no legal moves = game over
   - Stalemate: King not in check but no legal moves = draw

4. ILLEGAL MOVES: Never move into check or make illegal moves
5. NOTATION: Use standard algebraic notation (e.g., 'e4', 'Nf3', 'O-O', 'O-O-O', 'exd5', 'Qh5+', 'Nxf7#')

FEN: ${fen}

What is your move? Respond with ONLY the move in algebraic notation. No explanations or analysis.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 10,
          },
        }),
      }
    );

    console.log("📡 Google Gemini Response Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Google Gemini API Error:", errorText);
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const move = data.candidates[0].content.parts[0].text.trim();
    
    console.log("✅ Google Gemini Response:", {
      rawResponse: data,
      extractedMove: move,
      timestamp: new Date().toISOString()
    });

    return move;
  }

  private shouldSkipApiCall(agent: Agent): boolean {
    // Skip OpenRouter calls if rate limit exceeded
    if (this.rateLimitExceeded && (agent.type === 'deepseek' || agent.type === 'grok' || agent.type === 'claude' || agent.type === 'gpt')) {
      return true;
    }
    return false;
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
          apiKey = apiKeys.deepseek;
          if (!apiKey) throw new Error("DeepSeek API key not set");
          model = "deepseek/deepseek-chat-v3.1:free";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "grok":
          apiKey = apiKeys.grok;
          if (!apiKey) throw new Error("OpenAI API key not set");
          model = "openai/gpt-oss-20b:free";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "gemini":
          apiKey = apiKeys.gemini;
          if (!apiKey) throw new Error("Google Gemini API key not set");
          moveText = await this.callGoogleGemini(fen, apiKey);
          break;
        case "claude":
          apiKey = apiKeys.claude;
          if (!apiKey) throw new Error("Mistral API key not set");
          model = "mistralai/mistral-small-3.2-24b-instruct:free";
          moveText = await this.callOpenRouter(fen, apiKey, model);
          break;
        case "gpt":
          apiKey = apiKeys.openai;
          if (!apiKey) throw new Error("DeepSeek API key not set");
          model = "deepseek/deepseek-chat-v3.1:free";
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
        console.log("🔑 API Key Issue Detected!");
        console.log("💡 Please check your API keys:");
        console.log("📋 Current Models:");
        console.log("   - DeepSeek: deepseek/deepseek-chat-v3.1:free (OpenRouter)");
        console.log("   - OpenAI: openai/gpt-oss-20b:free (OpenRouter)");
        console.log("   - Google Gemini: gemini-2.0-flash-exp (Google AI Studio)");
        console.log("   - Mistral: mistralai/mistral-small-3.2-24b-instruct:free (OpenRouter)");
        console.log("   - DeepSeek: deepseek/deepseek-chat-v3.1:free (OpenRouter)");
      }
      
      // Check if it's a payment/credits error
      if (error.message.includes("402") || error.message.includes("Payment Required") || error.message.includes("Insufficient credits")) {
        console.log("💳 OpenRouter Credits Issue Detected!");
        console.log("💡 Your OpenRouter account needs credits to use paid models");
        console.log("📋 Solution: All agents now use free models");
        console.log("   - DeepSeek: deepseek/deepseek-chat-v3.1:free");
        console.log("   - OpenAI: openai/gpt-oss-20b:free");
        console.log("   - Mistral: mistralai/mistral-small-3.2-24b-instruct:free");
        console.log("   - Google Gemini: Uses separate Google AI Studio API");
        console.log("   - All models are completely free and don't require credits");
      }
      
      // Check if it's a rate limit error
      if (error.message.includes("429") || error.message.includes("Rate limit exceeded") || error.message.includes("Too Many Requests")) {
        this.rateLimitExceeded = true;
        console.log("⏰ OpenRouter Rate Limit Exceeded!");
        console.log("💡 You've hit the daily free tier limit (50 requests)");
        
        if (this.rateLimitResetTime) {
          const resetDate = new Date(this.rateLimitResetTime);
          const hoursUntilReset = Math.ceil((this.rateLimitResetTime - Date.now()) / (1000 * 60 * 60));
          console.log(`🕐 Rate limit resets at: ${resetDate.toLocaleString()}`);
          console.log(`⏳ Time until reset: ~${hoursUntilReset} hours`);
        }
        
        console.log("📋 Solutions:");
        console.log("   - Wait 24 hours for the limit to reset");
        console.log("   - Add 10 credits to unlock 1000 requests per day");
        console.log("   - Visit: https://openrouter.ai/settings/credits");
        console.log("🛑 Game will stop when affected agents try to make moves");
      }
      
      // Check if it's a Google API key error
      if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
        console.log("🔑 Google Gemini API Key Issue Detected!");
        console.log("💡 The Google Gemini API key is invalid or incorrect");
        console.log("📋 Solution: Update the API key in localStorage");
        console.log("   - Run: setAllApiKeys() in browser console");
        console.log("   - Or manually set: localStorage.setItem('ai-chess-api-keys', JSON.stringify({...}))");
        console.log("   - Google API key should be: AIzaSyAGdapWB5H4Igg7aQYVO6XnMeLbFsTxkQk");
      }
      
      // Check if it's a rate limit error - no fallback, return null
      if (error.message.includes("429") || error.message.includes("Rate limit exceeded")) {
        console.log("⏸️ Rate limit exceeded, no move will be made:", {
          agent: agent.name,
          reason: "Rate limit exceeded, game should stop"
        });
        return null;
      }
      
      // No move will be made on other errors
      console.log("❌ No move will be made due to API error:", {
        agent: agent.name,
        error: error.message,
        availableMoves: game.moves()
      });
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
