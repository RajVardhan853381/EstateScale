import { describe, it, expect, vi } from "vitest";
import { CircuitBreaker } from "../../src/lib/reliability/circuit-breaker";

describe("CircuitBreaker", () => {
    it("should allow successful requests through when CLOSED", async () => {
        const breaker = new CircuitBreaker();
        const action = vi.fn().mockResolvedValue("success");

        const result = await breaker.execute(action);
        expect(result).toBe("success");
        expect(action).toHaveBeenCalledTimes(1);
    });

    it("should trip to OPEN after threshold failures", async () => {
        const breaker = new CircuitBreaker(2, 5000);
        const failAction = vi.fn().mockRejectedValue(new Error("fail"));

        await expect(breaker.execute(failAction)).rejects.toThrow("fail");
        await expect(breaker.execute(failAction)).rejects.toThrow("fail");

        // Third should throw OPEN circuit error instantly without calling failAction
        const thirdAction = vi.fn().mockResolvedValue("should not reach");
        await expect(breaker.execute(thirdAction)).rejects.toThrow("Circuit breaker is OPEN");
        expect(thirdAction).not.toHaveBeenCalled();
    });
});
