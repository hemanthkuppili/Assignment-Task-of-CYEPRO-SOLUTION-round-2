import { config } from '../config/index.js';

class CircuitBreaker {
    constructor(name) {
        this.name = name;
        this.state = 'CLOSED'; // OPEN, CLOSED, HALF_OPEN
        this.failures = 0;
        this.totalRequests = 0;
        this.lastFailureTime = null;
        this.failureThreshold = config.circuitBreakerThreshold; // 0.5
        this.windowMs = config.circuitBreakerWindowMs; // 60s
    }

    async call(fn, fallback) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.windowMs) {
                this.state = 'HALF_OPEN';
            } else {
                return fallback();
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            return fallback();
        }
    }

    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
        this.totalRequests++;
    }

    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= 5) { // Simple trigger
            this.state = 'OPEN';
        }
    }

    getStatus() {
        return this.state;
    }
}

export const aiCircuitBreaker = new CircuitBreaker('AI_Classifier');
export const dbCircuitBreaker = new CircuitBreaker('Database_Connection');
