import { Injectable } from '@nestjs/common';
import { createProviderFailure } from '../domain/provider-failure';
import { FxProviderPort, FxRateObservation, normalizeCurrencyCode, validateFxObservation } from '../domain/fx-provider';
import { ProviderResult } from '../domain/provider-contracts';
import { FxRateRepository } from '../infrastructure/fx-rate.repository';
import { IntegrationProviderRegistry } from './provider-registry';

@Injectable()
export class FxRateService {
  constructor(
    private readonly registry: IntegrationProviderRegistry,
    private readonly repo: FxRateRepository,
  ) {}

  async fetch(input: {
    providerKey: string;
    sourceCurrencyCode: string;
    timeoutMs?: number;
    maxAgeMs?: number;
  }): Promise<ProviderResult<FxRateObservation>> {
    const providerKey = String(input.providerKey ?? '').trim();
    const sourceCurrencyCode = normalizeCurrencyCode(input.sourceCurrencyCode);
    const timeoutMs = input.timeoutMs ?? 3000;
    const maxAgeMs = input.maxAgeMs ?? 15 * 60_000;

    if (!providerKey) return { ok: false, failure: createProviderFailure({ kind: 'invalid_request', code: 'FX_PROVIDER_KEY_REQUIRED', message: 'FX provider key is required.' }) };
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) return { ok: false, failure: createProviderFailure({ kind: 'invalid_request', code: 'FX_TIMEOUT_INVALID', message: 'FX timeout is invalid.' }) };
    if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 60_000 || maxAgeMs > 86_400_000) return { ok: false, failure: createProviderFailure({ kind: 'invalid_request', code: 'FX_MAX_AGE_INVALID', message: 'FX freshness window is invalid.' }) };

    const generic = this.registry.get(providerKey);
    if (!generic) return { ok: false, failure: createProviderFailure({ kind: 'unavailable', code: 'FX_PROVIDER_NOT_REGISTERED', message: 'FX provider is not registered.', retry: 'never' }) };
    if (generic.kind !== 'fx' || typeof (generic as FxProviderPort).fetchRate !== 'function') {
      return { ok: false, failure: createProviderFailure({ kind: 'invalid_request', code: 'FX_PROVIDER_KIND_MISMATCH', message: 'Registered provider is not an FX provider.' }) };
    }

    const provider = generic as FxProviderPort;
    let result: ProviderResult<FxRateObservation>;
    try {
      result = await provider.fetchRate(
        { sourceCurrencyCode, targetUnit: 'TOMAN' },
        { requestId: `fx:${provider.key}:${sourceCurrencyCode}:${Date.now()}`, operation: 'read', timeoutMs },
      );
    } catch (error) {
      return {
        ok: false,
        failure: createProviderFailure({
          kind: 'unknown',
          code: 'FX_PROVIDER_UNHANDLED_FAILURE',
          message: 'FX provider failed unexpectedly.',
          safeDetails: error instanceof Error ? { name: error.name } : undefined,
        }),
      };
    }

    if (!result.ok) return result;

    let observation: FxRateObservation;
    try {
      observation = validateFxObservation(result.value, sourceCurrencyCode, new Date(), maxAgeMs);
    } catch (error) {
      return {
        ok: false,
        failure: createProviderFailure({
          kind: 'invalid_response',
          code: error instanceof Error ? error.message : 'FX_OBSERVATION_INVALID',
          message: 'FX provider returned an invalid or stale rate observation.',
          providerRequestId: result.providerRequestId ?? null,
        }),
      };
    }

    await this.repo.record({
      providerKey: provider.key,
      observation,
      fetchedAt: new Date(),
      providerRequestId: result.providerRequestId ?? null,
    });

    return { ok: true, value: observation, providerRequestId: result.providerRequestId ?? null };
  }

  latest(providerKey: string, sourceCurrencyCode: string) {
    return this.repo.latest(String(providerKey ?? '').trim(), normalizeCurrencyCode(sourceCurrencyCode));
  }
}
