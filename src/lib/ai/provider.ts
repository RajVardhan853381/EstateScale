import { generateObject, generateText } from "ai";
import { getAiProviderModel, AI_CONFIG } from "./config";
import { z } from "zod";

import { LanguageModelUsage } from "ai";

export interface AIProvider {
    generateStructuredOutput<T>(
        prompt: string,
        schema: z.ZodSchema<T>,
        modelId?: string
    ): Promise<{ object: T, usage: LanguageModelUsage }>;

    generateString(
        prompt: string,
        modelId?: string
    ): Promise<{ text: string, usage: LanguageModelUsage }>;
}

export class OpenAIProvider implements AIProvider {
    async generateStructuredOutput<T>(prompt: string, schema: z.ZodSchema<T>, modelId: string = AI_CONFIG.fastModel) {
        const result = await generateObject({
            model: getAiProviderModel(modelId),
            schema,
            prompt,
            temperature: AI_CONFIG.temperature,
            maxRetries: 1,
            abortSignal: AbortSignal.timeout(AI_CONFIG.defaultTimeout),
        });

        return {
            object: result.object as T,
            usage: result.usage
        };
    }

    async generateString(prompt: string, modelId: string = AI_CONFIG.fastModel) {
        const result = await generateText({
            model: getAiProviderModel(modelId),
            prompt,
            temperature: AI_CONFIG.temperature + 0.3, // Slightly more creative for response generation
            maxRetries: 1,
            abortSignal: AbortSignal.timeout(AI_CONFIG.defaultTimeout),
        });

        return {
            text: result.text,
            usage: result.usage
        };
    }
}

export class MockAIProvider implements AIProvider {
    constructor(private mockResponse: unknown) {}

    async generateStructuredOutput<T>() {
        return {
            object: this.mockResponse as T,
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } as unknown as LanguageModelUsage
        };
    }

    async generateString() {
        return {
            text: typeof this.mockResponse === "string" ? this.mockResponse : "Mock response",
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } as unknown as LanguageModelUsage
        };
    }
}
