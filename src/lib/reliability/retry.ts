import { auditLogger } from "../observability/logger";

export async function withRetry<T>(
    action: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await action();
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
                auditLogger.error({ attempt, error: (error as Error).message }, "Max retries exhausted.");
                throw error;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
            auditLogger.warn({ attempt, delay, error: (error as Error).message }, "Action failed, retrying...");
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error("Unreachable");
}
