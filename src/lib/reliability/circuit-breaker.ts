export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

    constructor(
        private threshold: number = 5,
        private resetTimeoutMs: number = 30000
    ) {}

    async execute<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === "OPEN") {
            if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
                this.state = "HALF_OPEN";
            } else {
                throw new Error("Circuit breaker is OPEN. Service degraded.");
            }
        }

        try {
            const result = await action();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failures = 0;
        this.state = "CLOSED";
    }

    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.state = "OPEN";
        }
    }
}
