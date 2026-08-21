import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AiProviderPort,
  AiTextGenerationRequest,
} from '../src/modules/ai/domain/ai-provider-contracts';
import {
  createAiProviderFailure,
  retryDispositionForAiFailure,
} from '../src/modules/ai/domain/ai-provider-failure';

test('A2 keeps provider port vendor-neutral and text-generation focused', async () => {
  const provider: AiProviderPort = {
    key: 'test-provider',
    displayName: 'Test Provider',
    capabilities: ['text_generation'],
    async generateText(request: AiTextGenerationRequest) {
      return {
        ok: true as const,
        value: {
          text: request.input,
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          providerRequestId: 'req-1',
          model: 'model-1',
        },
      };
    },
  };

  const result = await provider.generateText({
    context: {
      requestId: 'app-1',
      operation: 'product_qa',
      promptKey: 'product-qa',
      promptVersion: 1,
      timeoutMs: 5_000,
    },
    input: 'question',
    maxOutputTokens: 128,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.text, 'question');
});

test('A2 failure retry semantics are deterministic', () => {
  assert.equal(retryDispositionForAiFailure('authentication'), 'never');
  assert.equal(retryDispositionForAiFailure('content_blocked'), 'never');
  assert.equal(retryDispositionForAiFailure('timeout'), 'safe');
  assert.equal(retryDispositionForAiFailure('rate_limited'), 'safe');
  assert.equal(retryDispositionForAiFailure('invalid_response'), 'conditional');
  assert.equal(retryDispositionForAiFailure('unknown'), 'conditional');
});

test('A2 failure factory trims safe identifiers and rejects invalid retry delay', () => {
  const failure = createAiProviderFailure({
    kind: 'rate_limited',
    code: ' AI_RATE_LIMITED ',
    message: ' Provider rate limit ',
    retryAfterMs: 1_000,
    providerRequestId: ' upstream-1 ',
    safeDetails: { region: 'eu' },
  });

  assert.equal(failure.code, 'AI_RATE_LIMITED');
  assert.equal(failure.message, 'Provider rate limit');
  assert.equal(failure.retry, 'safe');
  assert.equal(failure.providerRequestId, 'upstream-1');
  assert.throws(() => createAiProviderFailure({
    kind: 'timeout',
    code: 'AI_TIMEOUT',
    message: 'timeout',
    retryAfterMs: -1,
  }));
});
