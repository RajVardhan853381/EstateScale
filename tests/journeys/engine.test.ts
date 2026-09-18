import { describe, it, expect, vi } from "vitest";
import { JourneyDefinitionSchema } from "../../src/lib/journeys/types";

describe("Journey Engine", () => {
    it("should safely parse valid journey steps", () => {
        const rawSteps = {
            startStepId: "step1",
            steps: [
                {
                    id: "step1",
                    type: "ACTION",
                    actionType: "SEND_SMS",
                    nextStepId: "step2"
                },
                {
                    id: "step2",
                    type: "END"
                }
            ]
        };

        const result = JourneyDefinitionSchema.parse(rawSteps);
        expect(result.startStepId).toBe("step1");
        expect(result.steps.length).toBe(2);
    });

    it("should reject invalid configurations natively via zod bindings", () => {
        const invalidSteps = {
            startStepId: "step1",
            steps: [
                {
                    id: "step1",
                    type: "FAKE_TYPE",
                    nextStepId: "step2"
                }
            ]
        };

        expect(() => JourneyDefinitionSchema.parse(invalidSteps)).toThrow();
    });
});
