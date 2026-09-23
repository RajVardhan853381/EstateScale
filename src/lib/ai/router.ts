/**
 * EstateScale Centralized AI Model Router
 *
 * Implements a Two-Tier Intelligent Routing Architecture:
 * - Tier 1 (Premium / Cognitive Reasoning): Gemini 3.8 Flash for deep analysis, nuanced outreach, and journey AI decisions.
 * - Tier 2 (Economy / High-Volume Workhorse): Gemini 1.5 Flash 8B for fast extraction, classification, normalization, and summaries.
 */

export type AITaskType =
  | 'COMPLEX_REASONING'
  | 'LEAD_ANALYSIS'
  | 'OUTREACH_GENERATION'
  | 'AI_DECISION'
  | 'EXTRACTION'
  | 'CLASSIFICATION'
  | 'NORMALIZATION'
  | 'SIMPLE_SUMMARY';

export type ModelTier = 'PREMIUM' | 'ECONOMY';

export interface RouteResolution {
  taskType: AITaskType;
  tier: ModelTier;
  model: string;
  fallbackModel: string | null;
  allowFallback: boolean;
  description: string;
}

/**
 * Task tier classification registry.
 * Encapsulates the domain business rules for model assignment.
 */
export const TASK_TIER_MAPPING: Record<
  AITaskType,
  {
    tier: ModelTier;
    allowFallback: boolean;
    description: string;
  }
> = {
  LEAD_ANALYSIS: {
    tier: 'PREMIUM',
    allowFallback: false, // Critical business logic: do not silently downgrade reasoning quality
    description: 'Comprehensive lead intent, scoring, and qualification analysis',
  },
  OUTREACH_GENERATION: {
    tier: 'PREMIUM',
    allowFallback: false, // Customer-facing sales communication requires maximum nuance
    description: 'Personalized customer-facing sales communication draft generation',
  },
  AI_DECISION: {
    tier: 'PREMIUM',
    allowFallback: false, // Autonomous journey branching requires high-level reasoning
    description: 'Autonomous CRM journey step decision and branching logic',
  },
  COMPLEX_REASONING: {
    tier: 'PREMIUM',
    allowFallback: false, // Strategic synthesis and complex deductions
    description: 'General complex analytical deduction and strategic recommendations',
  },
  EXTRACTION: {
    tier: 'ECONOMY',
    allowFallback: true, // High volume, deterministic parsing: falls back to premium on failure
    description: 'Deterministic structured field extraction (budget, timeline, location)',
  },
  CLASSIFICATION: {
    tier: 'ECONOMY',
    allowFallback: true, // Repetitive categorizations with fixed enum outputs
    description: 'Intent, sentiment, and message type classification',
  },
  NORMALIZATION: {
    tier: 'ECONOMY',
    allowFallback: true, // Standardizing unstructured strings to canonical formats
    description: 'Data cleansing, unit normalization, and schema standardization',
  },
  SIMPLE_SUMMARY: {
    tier: 'ECONOMY',
    allowFallback: true, // Fast lightweight summarization of notes and messages
    description: 'Lightweight extractive summary of communication and activity history',
  },
};

/**
 * Resolves the operational model route for a given task type.
 * Reads environment overrides dynamically so models can be changed without code changes.
 */
export function resolveModelRoute(taskType: AITaskType): RouteResolution {
  const taskConfig = TASK_TIER_MAPPING[taskType] || {
    tier: 'PREMIUM',
    allowFallback: false,
    description: 'Unclassified task defaulting to premium tier',
  };

  const premiumModel =
    process.env.GEMINI_REASONING_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-3.8-flash';

  const economyModel =
    process.env.GEMINI_ECONOMY_MODEL ||
    process.env.GEMINI_FAST_MODEL ||
    'gemini-1.5-flash-8b';

  const fallbackGloballyEnabled = process.env.AI_FALLBACK_ENABLED !== 'false';

  if (taskConfig.tier === 'PREMIUM') {
    return {
      taskType,
      tier: 'PREMIUM',
      model: premiumModel,
      fallbackModel: null, // Premium tasks never downgrade
      allowFallback: false,
      description: taskConfig.description,
    };
  }

  return {
    taskType,
    tier: 'ECONOMY',
    model: economyModel,
    fallbackModel: fallbackGloballyEnabled ? premiumModel : null,
    allowFallback: fallbackGloballyEnabled && taskConfig.allowFallback,
    description: taskConfig.description,
  };
}
