import { AITaskType, resolveModelRoute } from './router';

/**
 * Real-time token pricing registry (USD per 1,000,000 tokens)
 * Official Google Gemini published API rates
 */
export const MODEL_PRICING: Record<string, { promptPerMillion: number; completionPerMillion: number }> = {
  // Tier 1: Premium / Reasoning
  'gemini-3.8-flash': {
    promptPerMillion: 0.10,
    completionPerMillion: 0.40,
  },
  // Tier 2: Economy / High-Volume Workhorse
  'gemini-1.5-flash-8b': {
    promptPerMillion: 0.0375,
    completionPerMillion: 0.15,
  },
  // Other Gemini family models
  'gemini-1.5-flash': {
    promptPerMillion: 0.075,
    completionPerMillion: 0.30,
  },
  'gemini-2.0-flash': {
    promptPerMillion: 0.10,
    completionPerMillion: 0.40,
  },
  'gemini-2.5-flash': {
    promptPerMillion: 0.15,
    completionPerMillion: 0.60,
  },
  'gemini-1.5-pro': {
    promptPerMillion: 1.25,
    completionPerMillion: 5.00,
  },
  // Legacy / cross-provider rates for historical data reporting
  'gpt-4o-mini': {
    promptPerMillion: 0.15,
    completionPerMillion: 0.60,
  },
  'gpt-4o': {
    promptPerMillion: 2.50,
    completionPerMillion: 10.00,
  },
  'gpt-3.5-turbo': {
    promptPerMillion: 0.50,
    completionPerMillion: 1.50,
  },
};

/**
 * Calculates the estimated USD cost of an LLM generation based on model and token counts.
 */
export function calculateAiCost(
  model: string,
  inputTokens: number = 0,
  outputTokens: number = 0
): number {
  const normalizedModel =
    Object.keys(MODEL_PRICING).find((key) => model.toLowerCase().includes(key)) || 'gemini-3.8-flash';
  const pricing = MODEL_PRICING[normalizedModel];

  const inputCost = (inputTokens / 1_000_000) * pricing.promptPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.completionPerMillion;

  // Round to 6 decimal places for accounting precision
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Pre-execution cost estimator based on task type.
 * Useful for pre-flight quota checks and budget reservations.
 */
export function estimateTaskCost(
  taskType: AITaskType,
  estimatedInputTokens: number = 600,
  estimatedOutputTokens: number = 250
): number {
  const route = resolveModelRoute(taskType);
  return calculateAiCost(route.model, estimatedInputTokens, estimatedOutputTokens);
}
