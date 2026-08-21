import { Injectable } from '@nestjs/common';
import { createProviderFailure } from '../domain/provider-failure';
import { ProviderHealthResult } from '../domain/provider-contracts';
import { IntegrationProviderRegistry } from './provider-registry';
import { ProviderHealthRepository } from '../infrastructure/provider-health.repository';

@Injectable()
export class ProviderHealthService {
  constructor(
    private readonly registry: IntegrationProviderRegistry,
    private readonly repo: ProviderHealthRepository,
  ) {}

  async check(key: string, timeoutMs = 3000): Promise<ProviderHealthResult> {
    const provider = this.registry.get(key);
    if (!provider) throw new Error('INTEGRATION_PROVIDER_NOT_REGISTERED');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error('PROVIDER_HEALTH_TIMEOUT_INVALID');

    const started = Date.now();
    let result: ProviderHealthResult;
    try {
      result = await provider.health({
        requestId: `health:${provider.key}:${started}`,
        operation: 'health',
        timeoutMs,
      });
    } catch (error) {
      result = {
        state: 'unknown',
        checkedAt: new Date(),
        latencyMs: Date.now() - started,
        failure: createProviderFailure({
          kind: 'unknown',
          code: 'PROVIDER_HEALTH_UNHANDLED_FAILURE',
          message: 'Provider health check failed unexpectedly.',
          safeDetails: error instanceof Error ? { name: error.name } : undefined,
        }),
      };
    }

    const normalized: ProviderHealthResult = {
      ...result,
      checkedAt: result.checkedAt instanceof Date && !Number.isNaN(result.checkedAt.getTime()) ? result.checkedAt : new Date(),
      latencyMs: result.latencyMs ?? Math.max(0, Date.now() - started),
    };
    await this.repo.record({ providerKey: provider.key, providerKind: provider.kind, result: normalized });
    return normalized;
  }

  async checkAll(timeoutMs = 3000): Promise<Array<{ key: string; result: ProviderHealthResult }>> {
    const output: Array<{ key: string; result: ProviderHealthResult }> = [];
    for (const provider of this.registry.list()) output.push({ key: provider.key, result: await this.check(provider.key, timeoutMs) });
    return output;
  }

  current() { return this.repo.current(); }

  summary(windowMinutes = 60) {
    if (!Number.isSafeInteger(windowMinutes) || windowMinutes < 1 || windowMinutes > 43_200) throw new Error('PROVIDER_HEALTH_WINDOW_INVALID');
    return this.repo.summary(new Date(Date.now() - windowMinutes * 60_000));
  }
}
