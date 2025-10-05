import { useState, useEffect } from "react";
import { ApiKeys } from "@/types/chess";

const STORAGE_KEY = "ai-chess-api-keys";

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    
    // If no keys are stored, set them automatically
    if (!stored || Object.keys(parsed).length === 0) {
      console.log("🔑 No API keys found, setting OpenRouter defaults...");
      const defaultKeys: ApiKeys = {
        deepseek: "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",
        grok: "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",
        gemini: "AIzaSyAGdapWB5H4Igg7aQYVO6XnMeLbFsTxkQk",
        claude: "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",
        openai: "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"
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultKeys));
      return defaultKeys;
    }
    
    console.log("🔑 Loading API keys from localStorage:", parsed);
    return parsed;
  });

  useEffect(() => {
    console.log("💾 Saving API keys to localStorage:", apiKeys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  const updateApiKey = (provider: keyof ApiKeys, key: string) => {
    console.log("🔄 Updating API key:", { provider, key: key.substring(0, 10) + "..." });
    setApiKeys((prev) => {
      const updated = { ...prev, [provider]: key };
      console.log("📝 New API keys state:", updated);
      return updated;
    });
  };

  const clearApiKeys = () => {
    setApiKeys({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const setAllApiKeys = () => {
    const defaultKeys: ApiKeys = {
      deepseek: "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",
      grok: "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",
      gemini: "AIzaSyAGdapWB5H4Igg7aQYVO6XnMeLbFsTxkQk",
      claude: "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",
      openai: "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"
    };
    console.log("🚀 Setting all OpenRouter API keys:", Object.keys(defaultKeys));
    setApiKeys(defaultKeys);
  };

  // Make setAllApiKeys available globally for easy testing
  useEffect(() => {
    (window as any).setAllApiKeys = setAllApiKeys;
    console.log("💡 Run 'setAllApiKeys()' in console to set all OpenRouter API keys at once");
  }, []);

  return { apiKeys, updateApiKey, clearApiKeys, setAllApiKeys };
};
