import { createGoogleGenerativeAI, google } from '@ai-sdk/google';

export const AI_CONFIG = {
  provider: 'gemini' as const,
  reasoningModel: process.env.GEMINI_REASONING_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  economyModel: process.env.GEMINI_ECONOMY_MODEL || process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash-8b',
  defaultModel: process.env.GEMINI_REASONING_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  fastModel: process.env.GEMINI_ECONOMY_MODEL || process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash-8b',
  temperature: 0.2, // Low temperature for deterministic analysis
  maxTokens: 1000,
  defaultTimeout: 15000, // 15s to prevent long hanging Server Actions
  fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false',
};

// Factory for Google Gemini model instances with environment key resolution
export const getAiProviderModel = (modelId: string = AI_CONFIG.fastModel) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    const googleInstance = createGoogleGenerativeAI({ apiKey });
    return googleInstance(modelId);
  }
  return google(modelId);
};
