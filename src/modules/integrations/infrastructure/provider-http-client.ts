import { Injectable } from '@nestjs/common';
import { ProviderRequestContext, ProviderResult } from '../domain/provider-contracts';
import { createProviderFailure, mayRetryProviderFailure, providerFailureFromHttpStatus } from '../domain/provider-failure';
import { ProviderCircuitBreaker, ProviderCircuitBreakerPolicy } from './provider-circuit-breaker';

export interface ProviderHttpRequest {
  providerKey: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  context: ProviderRequestContext;
  maxAttempts: number;
  circuitBreaker: ProviderCircuitBreakerPolicy;
}

export interface ProviderHttpResponse {
  status: number;
  headers: Headers;
  text: string;
}

@Injectable()
export class ProviderHttpClient {
  constructor(private readonly circuitBreaker: ProviderCircuitBreaker) {}

  async execute(request: ProviderHttpRequest): Promise<ProviderResult<ProviderHttpResponse>> {
    this.assertRequest(request);
    if (!this.circuitBreaker.canExecute(request.providerKey, request.circuitBreaker)) {
      return { ok: false, failure: createProviderFailure({ kind: 'unavailable', code: 'PROVIDER_CIRCUIT_OPEN', message: 'Provider circuit is open.', retry: 'safe' }) };
    }

    let lastFailure = createProviderFailure({ kind: 'unknown', code: 'PROVIDER_REQUEST_NOT_EXECUTED', message: 'Provider request was not executed.' });
    for (let attempt = 1; attempt <= request.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.context.timeoutMs);
      try {
        const response = await fetch(request.url, {
          method: request.method ?? 'GET',
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
        const providerRequestId = response.headers.get('x-request-id') ?? response.headers.get('request-id');
        if (response.ok) {
          this.circuitBreaker.recordSuccess(request.providerKey);
          return { ok: true, value: { status: response.status, headers: response.headers, text: await response.text() }, providerRequestId };
        }
        const retryAfterMs = this.retryAfterMs(response.headers.get('retry-after'));
        lastFailure = providerFailureFromHttpStatus(response.status, { retryAfterMs, providerRequestId });
      } catch (error) {
        const timeout = error instanceof Error && error.name === 'AbortError';
        lastFailure = createProviderFailure({
          kind: timeout ? 'timeout' : 'network',
          code: timeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_FAILURE',
          message: timeout ? 'Provider request timed out.' : 'Provider network request failed.',
          safeDetails: error instanceof Error ? { name: error.name } : undefined,
        });
      } finally {
        clearTimeout(timer);
      }

      const retryable = mayRetryProviderFailure(lastFailure, {
        operation: request.context.operation,
        hasIdempotencyKey: Boolean(request.context.idempotencyKey),
      });
      if (!retryable || attempt >= request.maxAttempts) break;
      await this.delay(this.backoffMs(attempt, lastFailure.retryAfterMs));
    }

    this.circuitBreaker.recordFailure(request.providerKey, request.circuitBreaker);
    return { ok: false, failure: lastFailure };
  }

  private assertRequest(request: ProviderHttpRequest): void {
    if (!request.providerKey.trim()) throw new Error('PROVIDER_KEY_REQUIRED');
    const url = new URL(request.url);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('PROVIDER_HTTP_INSECURE_URL');
    if (!Number.isSafeInteger(request.context.timeoutMs) || request.context.timeoutMs < 100 || request.context.timeoutMs > 120_000) throw new Error('PROVIDER_TIMEOUT_INVALID');
    if (!Number.isInteger(request.maxAttempts) || request.maxAttempts < 1 || request.maxAttempts > 6) throw new Error('PROVIDER_MAX_ATTEMPTS_INVALID');
    if (request.context.operation === 'write' && request.maxAttempts > 1 && !request.context.idempotencyKey) throw new Error('PROVIDER_WRITE_RETRY_REQUIRES_IDEMPOTENCY');
  }

  private backoffMs(attempt: number, retryAfterMs?: number | null): number {
    if (retryAfterMs !== undefined && retryAfterMs !== null) return Math.min(retryAfterMs, 30_000);
    return Math.min(250 * (2 ** (attempt - 1)), 5_000);
  }

  private retryAfterMs(value: string | null): number | null {
    if (!value) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.round(seconds * 1000), 30_000);
    const date = Date.parse(value);
    if (Number.isNaN(date)) return null;
    return Math.max(0, Math.min(date - Date.now(), 30_000));
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
