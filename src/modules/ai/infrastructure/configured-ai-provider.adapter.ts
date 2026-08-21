import { Injectable } from '@nestjs/common';
import { ProviderConfigurationService } from '../../integrations/application/provider-configuration.service';
import { ProviderHttpClient } from '../../integrations/infrastructure/provider-http-client';
import { ProviderFailure } from '../../integrations/domain/provider-contracts';
import { AiProviderPort, AiProviderResult, AiTextGenerationOutput, AiTextGenerationRequest } from '../domain/ai-provider-contracts';
import { createAiProviderFailure } from '../domain/ai-provider-failure';

interface CanonicalAiProviderResponse {
  text?: unknown;
  usage?: { inputTokens?: unknown; outputTokens?: unknown; totalTokens?: unknown };
  providerRequestId?: unknown;
  model?: unknown;
}

@Injectable()
export class ConfiguredAiProviderAdapter implements AiProviderPort {
  readonly displayName = 'Configured AI Provider';
  readonly capabilities = ['text_generation'] as const;

  constructor(
    private readonly configuration: ProviderConfigurationService,
    private readonly http: ProviderHttpClient,
    readonly key: string = 'ai-default',
  ) {}

  async generateText(request: AiTextGenerationRequest): Promise<AiProviderResult<AiTextGenerationOutput>> {
    const loaded = await this.configuration.require(this.key);
    if (loaded.configuration.kind !== 'ai') {
      return { ok: false, failure: createAiProviderFailure({ kind: 'invalid_request', code: 'AI_PROVIDER_KIND_MISMATCH', message: 'Configured provider is not an AI provider.' }) };
    }
    if (!loaded.configuration.baseUrl) {
      return { ok: false, failure: createAiProviderFailure({ kind: 'invalid_request', code: 'AI_PROVIDER_BASE_URL_REQUIRED', message: 'AI provider base URL is required.' }) };
    }

    const path = this.relativePath(loaded.configuration.config['generationPath'] ?? '/v1/generate-text');
    const model = this.optionalBoundedString(loaded.configuration.config['model'], 200);
    const body = JSON.stringify({
      operation: request.context.operation,
      prompt: request.input,
      promptKey: request.context.promptKey,
      promptVersion: request.context.promptVersion,
      maxOutputTokens: request.maxOutputTokens,
      temperature: request.temperature ?? null,
      model,
      metadata: request.metadata ?? {},
    });
    const headers: Record<string,string> = {
      'content-type': 'application/json',
      'x-request-id': request.context.requestId,
      'x-idempotency-key': request.context.requestId,
    };
    if (loaded.secret) headers.authorization = `Bearer ${loaded.secret}`;

    const result = await this.http.execute({
      providerKey: this.key,
      url: `${loaded.configuration.baseUrl}${path}`,
      method: 'POST',
      headers,
      body,
      context: { requestId: request.context.requestId, operation: 'write', idempotencyKey: request.context.requestId, timeoutMs: Math.min(request.context.timeoutMs, loaded.configuration.timeoutMs) },
      maxAttempts: Math.max(1, loaded.configuration.retryMaxAttempts + 1),
      circuitBreaker: { failureThreshold: 3, openMs: 30_000 },
    });
    if (!result.ok) return { ok: false, failure: this.mapFailure(result.failure) };

    let parsed: CanonicalAiProviderResponse;
    try { parsed = JSON.parse(result.value.text) as CanonicalAiProviderResponse; }
    catch { return { ok:false, failure:createAiProviderFailure({kind:'invalid_response',code:'AI_PROVIDER_INVALID_JSON',message:'AI provider returned invalid JSON.',providerRequestId:result.providerRequestId??null})}; }

    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    const inputTokens = Number(parsed.usage?.inputTokens);
    const outputTokens = Number(parsed.usage?.outputTokens);
    const totalTokens = Number(parsed.usage?.totalTokens);
    if (!text || ![inputTokens,outputTokens,totalTokens].every(v=>Number.isSafeInteger(v)&&v>=0) || totalTokens < inputTokens + outputTokens) {
      return { ok:false, failure:createAiProviderFailure({kind:'invalid_response',code:'AI_PROVIDER_RESPONSE_INVALID',message:'AI provider response shape is invalid.',providerRequestId:result.providerRequestId??null})};
    }
    return { ok:true, value:{ text, usage:{inputTokens,outputTokens,totalTokens}, providerRequestId:this.optionalBoundedString(parsed.providerRequestId,200) ?? result.providerRequestId ?? null, model:this.optionalBoundedString(parsed.model,200) ?? model } };
  }

  private relativePath(value:unknown):string {
    const path=String(value??'').trim();
    if(!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]{1,300}$/.test(path) || path.includes('..')) throw new Error('AI_PROVIDER_PATH_INVALID');
    return path;
  }
  private optionalBoundedString(value:unknown,max:number):string|null { if(value==null)return null; const v=String(value).trim(); if(!v||v.length>max)throw new Error('AI_PROVIDER_CONFIG_VALUE_INVALID'); return v; }
  private mapFailure(f:ProviderFailure){
    const kind = f.kind==='not_found'||f.kind==='conflict' ? 'invalid_request' : f.kind;
    return createAiProviderFailure({kind,code:f.code,message:f.message,retryAfterMs:f.retryAfterMs??null,providerStatus:f.providerStatus??null,providerRequestId:f.providerRequestId??null});
  }
}
