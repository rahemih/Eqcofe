import { ProviderRequestContext } from './provider-contracts';

export function createProviderRequestContext(input: {
  requestId: string;
  operation: 'read' | 'write' | 'health';
  timeoutMs: number;
  idempotencyKey?: string | null;
}): ProviderRequestContext {
  const requestId = String(input.requestId ?? '').trim();
  if (!requestId) throw new Error('PROVIDER_REQUEST_ID_REQUIRED');
  if (!Number.isSafeInteger(input.timeoutMs) || input.timeoutMs <= 0 || input.timeoutMs > 120_000) throw new Error('PROVIDER_TIMEOUT_INVALID');
  const idempotencyKey = input.idempotencyKey === undefined || input.idempotencyKey === null ? null : String(input.idempotencyKey).trim();
  if (input.operation === 'write' && idempotencyKey === '') throw new Error('PROVIDER_IDEMPOTENCY_KEY_INVALID');
  return {
    requestId,
    operation: input.operation,
    timeoutMs: input.timeoutMs,
    idempotencyKey,
  };
}
