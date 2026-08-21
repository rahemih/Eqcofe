import { AiFailureKind, AiProviderFailure, AiRetryDisposition } from './ai-provider-contracts';

const NEVER_RETRY: ReadonlySet<AiFailureKind> = new Set([
  'authentication',
  'authorization',
  'invalid_request',
  'content_blocked',
  'context_too_large',
]);

const SAFE_RETRY: ReadonlySet<AiFailureKind> = new Set([
  'timeout',
  'network',
  'rate_limited',
  'unavailable',
  'upstream_error',
]);

export function retryDispositionForAiFailure(kind: AiFailureKind): AiRetryDisposition {
  if (NEVER_RETRY.has(kind)) return 'never';
  if (SAFE_RETRY.has(kind)) return 'safe';
  return 'conditional';
}

export interface AiFailureInput {
  kind: AiFailureKind;
  code: string;
  message: string;
  retryAfterMs?: number | null;
  providerStatus?: number | null;
  providerRequestId?: string | null;
  safeDetails?: Record<string, string | number | boolean | null>;
}

export function createAiProviderFailure(input: AiFailureInput): AiProviderFailure {
  const code = input.code.trim();
  const message = input.message.trim();

  if (!code) throw new Error('AI failure code is required.');
  if (!message) throw new Error('AI failure message is required.');
  if (input.retryAfterMs != null && (!Number.isInteger(input.retryAfterMs) || input.retryAfterMs < 0)) {
    throw new Error('AI retryAfterMs must be a non-negative integer.');
  }

  return {
    kind: input.kind,
    code,
    message,
    retry: retryDispositionForAiFailure(input.kind),
    retryAfterMs: input.retryAfterMs ?? null,
    providerStatus: input.providerStatus ?? null,
    providerRequestId: input.providerRequestId?.trim() || null,
    safeDetails: input.safeDetails,
  };
}
