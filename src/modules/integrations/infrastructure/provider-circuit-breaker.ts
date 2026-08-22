import { Injectable } from '@nestjs/common';

export interface ProviderCircuitBreakerPolicy {
  failureThreshold: number;
  openMs: number;
  halfOpenMaxCalls: number;
}

type CircuitState = {
  failures: number;
  openedAt: number | null;
  halfOpenCalls: number;
};

@Injectable()
export class ProviderCircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  canExecute(providerKey: string, policy: ProviderCircuitBreakerPolicy, now = Date.now()): boolean {
    this.assertPolicy(policy);
    const state = this.states.get(providerKey);
    if (!state || state.openedAt === null) return true;
    if (now - state.openedAt < policy.openMs) return false;
    if (state.halfOpenCalls >= policy.halfOpenMaxCalls) return false;
    state.halfOpenCalls += 1;
    return true;
  }

  recordSuccess(providerKey: string): void {
    this.states.delete(providerKey);
  }

  recordFailure(providerKey: string, policy: ProviderCircuitBreakerPolicy, now = Date.now()): void {
    this.assertPolicy(policy);
    const state = this.states.get(providerKey) ?? { failures: 0, openedAt: null, halfOpenCalls: 0 };
    state.failures += 1;
    if (state.openedAt !== null || state.failures >= policy.failureThreshold) {
      state.openedAt = now;
      state.halfOpenCalls = 0;
    }
    this.states.set(providerKey, state);
  }

  private assertPolicy(policy: ProviderCircuitBreakerPolicy): void {
    if (!Number.isInteger(policy.failureThreshold) || policy.failureThreshold < 1 || policy.failureThreshold > 100) throw new Error('PROVIDER_CIRCUIT_FAILURE_THRESHOLD_INVALID');
    if (!Number.isInteger(policy.openMs) || policy.openMs < 100 || policy.openMs > 600_000) throw new Error('PROVIDER_CIRCUIT_OPEN_MS_INVALID');
    if (!Number.isInteger(policy.halfOpenMaxCalls) || policy.halfOpenMaxCalls < 1 || policy.halfOpenMaxCalls > 10) throw new Error('PROVIDER_CIRCUIT_HALF_OPEN_INVALID');
  }
}
