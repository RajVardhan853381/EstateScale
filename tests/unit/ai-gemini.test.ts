import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGenerateObject = vi.fn();
const mockGenerateText = vi.fn();

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateObject: (...args: unknown[]) => mockGenerateObject(...args),
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  };
});

import {
  GeminiProvider,
  GoogleGeminiProvider,
  MockAIProvider,
  getOperationalAIProvider,
} from '../../src/lib/ai/provider';
import { AI_CONFIG, getAiProviderModel } from '../../src/lib/ai/config';
import { calculateAiCost, MODEL_PRICING } from '../../src/lib/ai/cost';
import { z } from 'zod';

describe('Gemini Flash 3.8 AI Provider & Architecture', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration & Models', () => {
    it('should have Gemini configured as the default provider and Gemini Flash 3.8 as reasoning model', () => {
      expect(AI_CONFIG.provider).toBe('gemini');
      expect(AI_CONFIG.defaultModel).toBe('gemini-3.8-flash');
      expect(AI_CONFIG.reasoningModel).toBe('gemini-3.8-flash');
      expect(AI_CONFIG.economyModel).toBe('gemini-1.5-flash-8b');
      expect(AI_CONFIG.fastModel).toBe('gemini-1.5-flash-8b');
      expect(AI_CONFIG.temperature).toBe(0.2);
      expect(AI_CONFIG.maxTokens).toBe(1000);
      expect(AI_CONFIG.defaultTimeout).toBe(15000);
    });

    it('should instantiate the model with gemini-3.8-flash using getAiProviderModel', () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const model = getAiProviderModel('gemini-3.8-flash');
      expect(model.modelId).toBe('gemini-3.8-flash');
    });

    it('should respect custom model overrides if specified in environment', () => {
      const customModel = getAiProviderModel('gemini-2.5-flash');
      expect(customModel.modelId).toBe('gemini-2.5-flash');
    });
  });

  describe('Provider Factory & Fallback Resolution', () => {
    it('should return MockAIProvider when no Gemini API keys are configured', () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const provider = getOperationalAIProvider();
      expect(provider).toBeInstanceOf(MockAIProvider);
    });

    it('should return GeminiProvider when GEMINI_API_KEY is configured', () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const provider = getOperationalAIProvider();
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider).toBeInstanceOf(GoogleGeminiProvider);
    });

    it('should return GeminiProvider when GOOGLE_GENERATIVE_AI_API_KEY is configured', () => {
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';

      const provider = getOperationalAIProvider();
      expect(provider).toBeInstanceOf(GeminiProvider);
    });
  });

  describe('GeminiProvider Execution', () => {
    it('should generate structured output adhering to schema via generateObject', async () => {
      const mockResult = {
        object: {
          intent: 'BUY',
          budget: 500000,
          confidence: 90,
        },
        usage: {
          promptTokens: 120,
          completionTokens: 40,
          totalTokens: 160,
        },
      };

      mockGenerateObject.mockResolvedValue(mockResult);

      const provider = new GeminiProvider();
      const testSchema = z.object({
        intent: z.string(),
        budget: z.number(),
        confidence: z.number(),
      });

      const result = await provider.generateStructuredOutput(
        'Analyze lead inquiry',
        testSchema,
        'gemini-3.8-flash'
      );

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Analyze lead inquiry',
          temperature: AI_CONFIG.temperature,
          maxRetries: 1,
        })
      );
      expect(result.object).toEqual(mockResult.object);
      expect(result.usage.totalTokens).toBe(160);
    });

    it('should generate string responses via generateText', async () => {
      const mockResult = {
        text: 'Draft response: Thanks for reaching out!',
        usage: {
          promptTokens: 80,
          completionTokens: 25,
          totalTokens: 105,
        },
      };

      mockGenerateText.mockResolvedValue(mockResult);

      const provider = new GeminiProvider();
      const result = await provider.generateString(
        'Draft a warm greeting',
        'gemini-3.8-flash'
      );

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Draft a warm greeting',
          temperature: AI_CONFIG.temperature + 0.3,
          maxRetries: 1,
        })
      );
      expect(result.text).toBe(mockResult.text);
      expect(result.usage.totalTokens).toBe(105);
    });
  });

  describe('Gemini Cost Registry & Precision', () => {
    it('should have accurate rates for gemini-3.8-flash ($0.10 input / $0.40 output per 1M)', () => {
      expect(MODEL_PRICING['gemini-3.8-flash']).toEqual({
        promptPerMillion: 0.10,
        completionPerMillion: 0.40,
      });
    });

    it('should compute exact costs with 6 decimal places of precision', () => {
      // 250,000 prompt tokens ($0.10/1M = $0.025) + 125,000 completion tokens ($0.40/1M = $0.050) = $0.075
      const cost = calculateAiCost('gemini-3.8-flash', 250_000, 125_000);
      expect(cost).toBe(0.075);
    });

    it('should compute costs for gemini-1.5-flash and gemini-2.5-flash correctly', () => {
      // 1.5-flash: $0.075 prompt / $0.30 completion
      const cost15 = calculateAiCost('gemini-1.5-flash', 1_000_000, 1_000_000);
      expect(cost15).toBe(0.375);

      // 2.5-flash: $0.15 prompt / $0.60 completion
      const cost25 = calculateAiCost('gemini-2.5-flash', 1_000_000, 1_000_000);
      expect(cost25).toBe(0.75);
    });
  });
});
