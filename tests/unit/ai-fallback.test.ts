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

import { GeminiProvider } from '../../src/lib/ai/provider';
import { z } from 'zod';

describe('Intelligent Model Fallback & Safety Policy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.AI_FALLBACK_ENABLED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Economy to Premium Fallback (Tier 2 -> Tier 1)', () => {
    it('should catch economy failure on EXTRACTION and gracefully succeed via Gemini 3.8 Flash fallback', async () => {
      // First attempt with economy model (gemini-1.5-flash-8b) rejects
      mockGenerateObject.mockRejectedValueOnce(new Error('Rate limit or quota issue on economy tier'));

      // Second attempt with fallback model (gemini-3.8-flash) succeeds
      const fallbackPayload = {
        object: { intent: 'BUY', budget: 750000 },
        usage: { promptTokens: 60, completionTokens: 20, totalTokens: 80 },
      };
      mockGenerateObject.mockResolvedValueOnce(fallbackPayload);

      const provider = new GeminiProvider();
      const testSchema = z.object({ intent: z.string(), budget: z.number() });

      const result = await provider.generateStructuredOutput(
        'Extract lead budget',
        testSchema,
        { taskType: 'EXTRACTION' }
      );

      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
      expect(result.fallbackTriggered).toBe(true);
      expect(result.modelUsed).toBe('gemini-3.8-flash');
      expect(result.object).toEqual(fallbackPayload.object);
    });

    it('should catch economy failure on generateString and fall back to Gemini 3.8 Flash', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Economy provider timeout'));

      const fallbackTextPayload = {
        text: 'Summary of the recent notes.',
        usage: { promptTokens: 50, completionTokens: 15, totalTokens: 65 },
      };
      mockGenerateText.mockResolvedValueOnce(fallbackTextPayload);

      const provider = new GeminiProvider();
      const result = await provider.generateString('Summarize note', {
        taskType: 'SIMPLE_SUMMARY',
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(2);
      expect(result.fallbackTriggered).toBe(true);
      expect(result.modelUsed).toBe('gemini-3.8-flash');
      expect(result.text).toBe(fallbackTextPayload.text);
    });

    it('should rethrow if both economy and fallback premium model fail', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('Economy failed'));
      mockGenerateObject.mockRejectedValueOnce(new Error('Premium fallback also failed'));

      const provider = new GeminiProvider();
      const testSchema = z.object({ intent: z.string() });

      await expect(
        provider.generateStructuredOutput('Extract data', testSchema, {
          taskType: 'EXTRACTION',
        })
      ).rejects.toThrow('Premium fallback also failed');

      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('Strict Premium No-Downgrade Policy (Tier 1)', () => {
    it('should NEVER silently downgrade LEAD_ANALYSIS to economy model upon failure', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('Gemini 3.8 Flash connection error'));

      const provider = new GeminiProvider();
      const testSchema = z.object({ score: z.number() });

      await expect(
        provider.generateStructuredOutput('Analyze lead context', testSchema, {
          taskType: 'LEAD_ANALYSIS',
        })
      ).rejects.toThrow('Gemini 3.8 Flash connection error');

      // Crucial: Must NOT have called generateObject a 2nd time with an inferior model
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('should NEVER silently downgrade OUTREACH_GENERATION to economy model upon failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Gemini 3.8 Flash timeout'));

      const provider = new GeminiProvider();

      await expect(
        provider.generateString('Draft customer outreach SMS', {
          taskType: 'OUTREACH_GENERATION',
        })
      ).rejects.toThrow('Gemini 3.8 Flash timeout');

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should NEVER silently downgrade AI_DECISION to economy model upon failure', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('AI decision failure'));

      const provider = new GeminiProvider();
      const testSchema = z.object({ decision: z.boolean() });

      await expect(
        provider.generateStructuredOutput('Evaluate journey branch', testSchema, {
          taskType: 'AI_DECISION',
        })
      ).rejects.toThrow('AI decision failure');

      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Toggle Control', () => {
    it('should not perform fallback when AI_FALLBACK_ENABLED is false', async () => {
      process.env.AI_FALLBACK_ENABLED = 'false';
      mockGenerateObject.mockRejectedValueOnce(new Error('Economy failed'));

      const provider = new GeminiProvider();
      const testSchema = z.object({ intent: z.string() });

      await expect(
        provider.generateStructuredOutput('Extract data', testSchema, {
          taskType: 'EXTRACTION',
        })
      ).rejects.toThrow('Economy failed');

      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });
  });
});
