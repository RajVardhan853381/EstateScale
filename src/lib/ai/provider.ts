import { generateObject, generateText, LanguageModelUsage } from 'ai';
import { getAiProviderModel, AI_CONFIG } from './config';
import { AITaskType, resolveModelRoute } from './router';
import { z } from 'zod';

export interface AIProviderOptions {
  taskType?: AITaskType;
  modelId?: string;
  temperature?: number;
}

export interface AIStructuredResult<T> {
  object: T;
  usage: LanguageModelUsage;
  modelUsed: string;
  fallbackTriggered: boolean;
}

export interface AITextResult {
  text: string;
  usage: LanguageModelUsage;
  modelUsed: string;
  fallbackTriggered: boolean;
}

export interface AIProvider {
  generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: string | AIProviderOptions
  ): Promise<AIStructuredResult<T>>;

  generateString(
    prompt: string,
    options?: string | AIProviderOptions
  ): Promise<AITextResult>;
}

function parseOptions(
  options?: string | AIProviderOptions,
  defaultTaskType: AITaskType = 'LEAD_ANALYSIS'
) {
  if (typeof options === 'string') {
    return {
      model: options,
      fallbackModel: null as string | null,
      allowFallback: false,
      temperature: AI_CONFIG.temperature,
      taskType: undefined,
    };
  }

  const taskType = options?.taskType || defaultTaskType;
  const route = resolveModelRoute(taskType);

  const model = options?.modelId || route.model;
  const allowFallback =
    route.allowFallback &&
    Boolean(route.fallbackModel) &&
    model !== route.fallbackModel;

  return {
    model,
    fallbackModel: route.fallbackModel,
    allowFallback,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
    taskType,
  };
}

export class GeminiProvider implements AIProvider {
  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: string | AIProviderOptions
  ): Promise<AIStructuredResult<T>> {
    const { model, fallbackModel, allowFallback, temperature, taskType } =
      parseOptions(options, 'LEAD_ANALYSIS');

    try {
      const result = await generateObject({
        model: getAiProviderModel(model),
        schema,
        prompt,
        temperature,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(AI_CONFIG.defaultTimeout),
      });

      return {
        object: result.object as T,
        usage: result.usage,
        modelUsed: model,
        fallbackTriggered: false,
      };
    } catch (primaryError) {
      if (allowFallback && fallbackModel) {
        console.warn(
          `[GeminiProvider] Economy model (${model}) failed for task [${taskType}]. Falling back to Premium tier (${fallbackModel}). Error: ${(primaryError as Error).message}`
        );

        const fallbackResult = await generateObject({
          model: getAiProviderModel(fallbackModel),
          schema,
          prompt,
          temperature,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(AI_CONFIG.defaultTimeout),
        });

        return {
          object: fallbackResult.object as T,
          usage: fallbackResult.usage,
          modelUsed: fallbackModel,
          fallbackTriggered: true,
        };
      }

      throw primaryError;
    }
  }

  async generateString(
    prompt: string,
    options?: string | AIProviderOptions
  ): Promise<AITextResult> {
    const { model, fallbackModel, allowFallback, temperature, taskType } =
      parseOptions(options, 'OUTREACH_GENERATION');

    try {
      const result = await generateText({
        model: getAiProviderModel(model),
        prompt,
        temperature: temperature + 0.3, // Slightly more creative for natural text
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(AI_CONFIG.defaultTimeout),
      });

      return {
        text: result.text,
        usage: result.usage,
        modelUsed: model,
        fallbackTriggered: false,
      };
    } catch (primaryError) {
      if (allowFallback && fallbackModel) {
        console.warn(
          `[GeminiProvider] Economy model (${model}) failed for task [${taskType}]. Falling back to Premium tier (${fallbackModel}). Error: ${(primaryError as Error).message}`
        );

        const fallbackResult = await generateText({
          model: getAiProviderModel(fallbackModel),
          prompt,
          temperature: temperature + 0.3,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(AI_CONFIG.defaultTimeout),
        });

        return {
          text: fallbackResult.text,
          usage: fallbackResult.usage,
          modelUsed: fallbackModel,
          fallbackTriggered: true,
        };
      }

      throw primaryError;
    }
  }
}

// Alias for explicit naming
export const GoogleGeminiProvider = GeminiProvider;

export class MockAIProvider implements AIProvider {
  constructor(private mockResponse: unknown) {}

  async generateStructuredOutput<T>(
    _prompt: string,
    _schema: z.ZodSchema<T>,
    options?: string | AIProviderOptions
  ): Promise<AIStructuredResult<T>> {
    const parsed = parseOptions(options);
    return {
      object: this.mockResponse as T,
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      } as unknown as LanguageModelUsage,
      modelUsed: parsed.model || 'mock-gemini-model',
      fallbackTriggered: false,
    };
  }

  async generateString(
    _prompt: string,
    options?: string | AIProviderOptions
  ): Promise<AITextResult> {
    const parsed = parseOptions(options);
    return {
      text: typeof this.mockResponse === 'string' ? this.mockResponse : 'Mock response',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      } as unknown as LanguageModelUsage,
      modelUsed: parsed.model || 'mock-gemini-model',
      fallbackTriggered: false,
    };
  }
}

/**
 * Resolves the operational AI provider according to current environment keys.
 */
export function getOperationalAIProvider(fallbackMockData?: unknown): AIProvider {
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );

  if (hasGeminiKey) {
    return new GeminiProvider();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: GEMINI_API_KEY is required in production environment; MockAIProvider is strictly disallowed.'
    );
  }

  return new MockAIProvider(fallbackMockData ?? 'Default Mock Response');
}
