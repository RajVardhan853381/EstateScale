import { openai } from "@ai-sdk/openai";

export const AI_CONFIG = {
  defaultModel: "gpt-4o",
  fastModel: "gpt-4o-mini",
  temperature: 0.2, // Low temperature for deterministic analysis
  maxTokens: 1000,
  defaultTimeout: 15000, // 15s to prevent long hanging Server Actions
};

// Configurable endpoint fallback mechanism allows injection of fake credentials or alternate URLs for local test/dev
export const getAiProviderModel = (modelId: string = AI_CONFIG.fastModel) => {
    return openai(modelId);
}
