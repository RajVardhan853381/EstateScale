import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveModelRoute, AITaskType, TASK_TIER_MAPPING } from '../../src/lib/ai/router';

describe('Two-Tier AI Model Router', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GEMINI_REASONING_MODEL;
    delete process.env.GEMINI_ECONOMY_MODEL;
    delete process.env.AI_FALLBACK_ENABLED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Tier 1: Premium Cognitive Reasoning Tasks', () => {
    const premiumTasks: AITaskType[] = [
      'LEAD_ANALYSIS',
      'OUTREACH_GENERATION',
      'AI_DECISION',
      'COMPLEX_REASONING',
    ];

    premiumTasks.forEach((taskType) => {
      it(`should route ${taskType} to Gemini 3.8 Flash without fallback`, () => {
        const route = resolveModelRoute(taskType);
        expect(route.taskType).toBe(taskType);
        expect(route.tier).toBe('PREMIUM');
        expect(route.model).toBe('gemini-3.8-flash');
        expect(route.allowFallback).toBe(false);
        expect(route.fallbackModel).toBeNull();
      });
    });
  });

  describe('Tier 2: Economy High-Volume Workhorse Tasks', () => {
    const economyTasks: AITaskType[] = [
      'EXTRACTION',
      'CLASSIFICATION',
      'NORMALIZATION',
      'SIMPLE_SUMMARY',
    ];

    economyTasks.forEach((taskType) => {
      it(`should route ${taskType} to Gemini 1.5 Flash 8B with fallback to Gemini 3.8 Flash`, () => {
        const route = resolveModelRoute(taskType);
        expect(route.taskType).toBe(taskType);
        expect(route.tier).toBe('ECONOMY');
        expect(route.model).toBe('gemini-1.5-flash-8b');
        expect(route.allowFallback).toBe(true);
        expect(route.fallbackModel).toBe('gemini-3.8-flash');
      });
    });
  });

  describe('Environment Variable Dynamic Overrides', () => {
    it('should respect custom GEMINI_REASONING_MODEL override', () => {
      process.env.GEMINI_REASONING_MODEL = 'gemini-2.5-pro-custom';

      const route = resolveModelRoute('LEAD_ANALYSIS');
      expect(route.model).toBe('gemini-2.5-pro-custom');
      expect(route.tier).toBe('PREMIUM');
    });

    it('should respect custom GEMINI_ECONOMY_MODEL override', () => {
      process.env.GEMINI_ECONOMY_MODEL = 'gemini-2.0-flash-lite';

      const route = resolveModelRoute('EXTRACTION');
      expect(route.model).toBe('gemini-2.0-flash-lite');
      expect(route.tier).toBe('ECONOMY');
      expect(route.fallbackModel).toBe('gemini-3.8-flash');
    });

    it('should disable fallback when AI_FALLBACK_ENABLED is false', () => {
      process.env.AI_FALLBACK_ENABLED = 'false';

      const route = resolveModelRoute('EXTRACTION');
      expect(route.allowFallback).toBe(false);
      expect(route.fallbackModel).toBeNull();
    });

    it('should handle unclassified/arbitrary task types gracefully by defaulting to premium tier', () => {
      const route = resolveModelRoute('UNKNOWN_ARBITRARY_TASK' as AITaskType);
      expect(route.tier).toBe('PREMIUM');
      expect(route.model).toBe('gemini-3.8-flash');
      expect(route.allowFallback).toBe(false);
    });
  });

  describe('Registry Integrity', () => {
    it('should have descriptions and classifications for all known task types', () => {
      const allTasks: AITaskType[] = [
        'COMPLEX_REASONING',
        'LEAD_ANALYSIS',
        'OUTREACH_GENERATION',
        'AI_DECISION',
        'EXTRACTION',
        'CLASSIFICATION',
        'NORMALIZATION',
        'SIMPLE_SUMMARY',
      ];

      allTasks.forEach((task) => {
        expect(TASK_TIER_MAPPING[task]).toBeDefined();
        expect(TASK_TIER_MAPPING[task].description).toBeTruthy();
      });
    });
  });
});
