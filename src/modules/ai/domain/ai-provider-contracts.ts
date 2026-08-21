export type AiCapability = 'text_generation';
export type AiOperationKind = 'product_qa' | 'draft_content';

export interface AiRequestContext {
  requestId: string;
  operation: AiOperationKind;
  promptKey: string;
  promptVersion: number;
  timeoutMs: number;
}

export interface AiTextGenerationRequest {
  context: AiRequestContext;
  input: string;
  maxOutputTokens: number;
  temperature?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiTextGenerationOutput {
  text: string;
  usage: AiUsage;
  providerRequestId?: string | null;
  model?: string | null;
}

export interface AiProviderDescriptor {
  readonly key: string;
  readonly displayName: string;
  readonly capabilities: readonly AiCapability[];
}

export interface AiProviderPort extends AiProviderDescriptor {
  generateText(request: AiTextGenerationRequest): Promise<AiProviderResult<AiTextGenerationOutput>>;
}

export type AiFailureKind =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'authentication'
  | 'authorization'
  | 'invalid_request'
  | 'content_blocked'
  | 'context_too_large'
  | 'unavailable'
  | 'upstream_error'
  | 'invalid_response'
  | 'unknown';

export type AiRetryDisposition = 'never' | 'safe' | 'conditional';

export interface AiProviderFailure {
  kind: AiFailureKind;
  code: string;
  message: string;
  retry: AiRetryDisposition;
  retryAfterMs?: number | null;
  providerStatus?: number | null;
  providerRequestId?: string | null;
  safeDetails?: Record<string, string | number | boolean | null>;
}

export type AiProviderResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: AiProviderFailure };
