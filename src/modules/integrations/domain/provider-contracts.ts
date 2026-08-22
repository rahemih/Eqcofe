export type IntegrationProviderKind = 'fx' | 'sms' | 'email' | 'shipping' | 'payment_aux' | 'ai';
export type IntegrationOperationKind = 'read' | 'write' | 'health';
export type ProviderHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';
export type ProviderRetryDisposition = 'never' | 'safe' | 'conditional';
export type ProviderFailureKind =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'authentication'
  | 'authorization'
  | 'invalid_request'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'upstream_error'
  | 'invalid_response'
  | 'unknown';

export interface ProviderRequestContext {
  requestId: string;
  operation: IntegrationOperationKind;
  idempotencyKey?: string | null;
  timeoutMs: number;
}

export interface ProviderFailure {
  kind: ProviderFailureKind;
  code: string;
  message: string;
  retry: ProviderRetryDisposition;
  retryAfterMs?: number | null;
  providerStatus?: number | null;
  providerRequestId?: string | null;
  safeDetails?: Record<string, unknown>;
}

export type ProviderResult<T> =
  | { ok: true; value: T; providerRequestId?: string | null; metadata?: Record<string, unknown> }
  | { ok: false; failure: ProviderFailure };

export interface ProviderHealthResult {
  state: ProviderHealthState;
  checkedAt: Date;
  latencyMs?: number | null;
  failure?: ProviderFailure | null;
  metadata?: Record<string, unknown>;
}

export interface IntegrationProviderDescriptor {
  readonly key: string;
  readonly kind: IntegrationProviderKind;
  readonly displayName: string;
}

export interface IntegrationProviderPort extends IntegrationProviderDescriptor {
  health(context: ProviderRequestContext): Promise<ProviderHealthResult>;
}
