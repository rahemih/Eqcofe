import { Injectable } from '@nestjs/common';
import { IntegrationProviderPort } from '../domain/provider-contracts';

@Injectable()
export class IntegrationProviderRegistry {
  private readonly providers = new Map<string, IntegrationProviderPort>();

  register(provider: IntegrationProviderPort): void {
    const key = String(provider.key ?? '').trim();
    if (!key) throw new Error('INTEGRATION_PROVIDER_KEY_REQUIRED');
    if (this.providers.has(key)) throw new Error('INTEGRATION_PROVIDER_DUPLICATE');
    this.providers.set(key, provider);
  }

  get(key: string): IntegrationProviderPort | null {
    return this.providers.get(String(key ?? '').trim()) ?? null;
  }

  list(): IntegrationProviderPort[] {
    return [...this.providers.values()].sort((a, b) => a.key.localeCompare(b.key));
  }
}
