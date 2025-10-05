import { ApiKeys } from "@/types/chess";

// Keys are defined in code only; no UI or localStorage.
const OPENROUTER_API_KEY = "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";
const GEMINI_API_KEY = "AIzaSyBvyyDD-BrlLmRxtl4ZpjDeIo8c1v-fy7o";

export const useApiKeys = () => {
  const apiKeys: ApiKeys = {
    openrouter: OPENROUTER_API_KEY,
    gemini: GEMINI_API_KEY,
  };

  return { apiKeys };
};
