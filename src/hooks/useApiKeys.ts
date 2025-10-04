import { useState, useEffect } from "react";
import { ApiKeys } from "@/types/chess";

const STORAGE_KEY = "ai-chess-api-keys";

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  const updateApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }));
  };

  const clearApiKeys = () => {
    setApiKeys({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return { apiKeys, updateApiKey, clearApiKeys };
};
