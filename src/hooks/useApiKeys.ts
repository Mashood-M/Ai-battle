import { ApiKeys } from "@/types/chess";

// Read API keys from Vite environment variables (configure in .env)
export const useApiKeys = () => {
  const env = (import.meta as any).env || {};
  const apiKeys: ApiKeys = {
    openrouter: env.VITE_OPENROUTER_API_KEY,
    gemini: env.VITE_GEMINI_API_KEY,
  };
  return { apiKeys };
};
