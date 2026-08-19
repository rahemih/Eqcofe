import { ProviderFailure, ProviderFailureKind, ProviderRetryDisposition } from './provider-contracts';

const RETRY_BY_KIND: Record<ProviderFailureKind, ProviderRetryDisposition> = {
  timeout: 'conditional',
  network: 'safe',
  rate_limited: 'safe',
  authentication: 'never',
  authorization: 'never',
  invalid_request: 'never',
  not_found: 'never',
  conflict: 'conditional',
  unavailable: 'safe',
  upstream_error: 'conditional',
  invalid_response: 'conditional',
  unknown: 'never',
};

export function createProviderFailure(input: {
  kind: ProviderFailureKind;
  code: string;
  message: string;
  retry?: ProviderRetryDisposition;
  retryAfterMs?: number | null;
  providerStatus?: number | null;
  providerRequestId?: string | null;
  safeDetails?: Record<string, unknown>;
}): ProviderFailure {
  const code = String(input.code ?? '').trim();
  const message = String(input.message ?? '').trim();
  if (!code) throw new Error('PROVIDER_FAILURE_CODE_REQUIRED');
  if (!message) throw new Error('PROVIDER_FAILURE_MESSAGE_REQUIRED');
  if (input.retryAfterMs !== undefined && input.retryAfterMs !== null && (!Number.isSafeInteger(input.retryAfterMs) || input.retryAfterMs < 0)) throw new Error('PROVIDER_RETRY_AFTER_INVALID');
  if (input.providerStatus !== undefined && input.providerStatus !== null && (!Number.isSafeInteger(input.providerStatus) || input.providerStatus < 100 || input.providerStatus > 599)) throw new Error('PROVIDER_STATUS_INVALID');

  return {
    kind: input.kind,
    code,
    message,
    retry: input.retry ?? RETRY_BY_KIND[input.kind],
    retryAfterMs: input.retryAfterMs ?? null,
    providerStatus: input.providerStatus ?? null,
    providerRequestId: input.providerRequestId ?? null,
    safeDetails: input.safeDetails,
  };
}

export function mayRetryProviderFailure(failure: ProviderFailure, input: { operation: 'read' | 'write' | 'health'; hasIdempotencyKey?: boolean }): boolean {
  if (failure.retry === 'never') return false;
  if (input.operation === 'write' && !input.hasIdempotencyKey) return false;
  if (failure.retry === 'safe') return true;
  return input.operation !== 'write' || input.hasIdempotencyKey === true;
}

export function providerFailureFromHttpStatus(status: number, input: { code?: string; message?: string; retryAfterMs?: number | null; providerRequestId?: string | null } = {}): ProviderFailure {
  const kind: ProviderFailureKind = status === 401
    ? 'authentication'
    : status === 403
      ? 'authorization'
      : status === 404
        ? 'not_found'
        : status === 409
          ? 'conflict'
          : status === 429
            ? 'rate_limited'
            : status >= 500
              ? 'upstream_error'
              : status >= 400
                ? 'invalid_request'
                : 'unknown';

  return createProviderFailure({
    kind,
    code: input.code ?? `PROVIDER_HTTP_${status}`,
    message: input.message ?? 'Provider request failed.',
    retryAfterMs: input.retryAfterMs,
    providerStatus: status,
    providerRequestId: input.providerRequestId,
  });
}
