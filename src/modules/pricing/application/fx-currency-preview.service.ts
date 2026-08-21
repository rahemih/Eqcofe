import { Injectable } from '@nestjs/common';
import { FxRateService } from '../../integrations/application/fx-rate.service';
import { DomainError } from '../../../shared/errors/domain-error';
import { CurrencyPricingService } from './currency-pricing.service';
import { CurrencyImpactService } from './currency-impact.service';

@Injectable()
export class FxCurrencyPreviewService {
  constructor(
    private readonly fx: FxRateService,
    private readonly currency: CurrencyPricingService,
    private readonly impact: CurrencyImpactService,
  ) {}

  async refreshPreview(input: {
    provider_key: string;
    source_currency_code?: string;
    timeout_ms?: number;
    max_age_ms?: number;
    scope_type?: 'all' | 'product' | 'brand' | 'category';
    scope_ids?: string[];
    include_inactive?: boolean;
  }) {
    const sourceCurrencyCode = String(input.source_currency_code ?? 'USD').trim().toUpperCase();
    const providerKey = String(input.provider_key ?? '').trim();
    const scopeType = String(input.scope_type ?? 'all');
    const scopeIds = Array.isArray(input.scope_ids) ? input.scope_ids : [];

    if (!providerKey) throw new DomainError('FX_PROVIDER_KEY_REQUIRED', 'Provider نرخ ارز الزامی است.');
    if (!['all', 'product', 'brand', 'category'].includes(scopeType)) throw new DomainError('VALIDATION_ERROR', 'دامنه پیش‌نمایش نرخ ارز معتبر نیست.');
    if (scopeType !== 'all' && scopeIds.length === 0) throw new DomainError('VALIDATION_ERROR', 'برای دامنه انتخابی حداقل یک شناسه لازم است.');

    const fetched = await this.fx.fetch({
      providerKey,
      sourceCurrencyCode,
      timeoutMs: input.timeout_ms,
      maxAgeMs: input.max_age_ms,
    });

    if (!fetched.ok) {
      throw new DomainError('FX_RATE_FETCH_FAILED', 'دریافت نرخ ارز از Provider ناموفق بود.', {
        provider_key: providerKey,
        failure_code: fetched.failure.code,
        failure_kind: fetched.failure.kind,
        retry: fetched.failure.retry,
      });
    }

    const registered = await this.currency.register({
      source_currency_code: fetched.value.sourceCurrencyCode,
      rate_to_toman: fetched.value.rateToToman,
      observed_at: fetched.value.observedAt,
      provider_id: null,
    });

    if (registered.status !== 'validated' && registered.status !== 'active') {
      throw new DomainError('FX_RATE_REQUIRES_REVIEW', 'نرخ دریافت‌شده به دلیل انحراف نیازمند بررسی مدیر است.', {
        currency_rate_id: registered.currency_rate_id,
        status: registered.status,
        deviation_percent: registered.deviation_percent,
      });
    }

    const preview = await this.impact.preview({
      currency_rate_id: registered.currency_rate_id,
      scope_type: scopeType,
      scope_ids: scopeIds,
      include_inactive: Boolean(input.include_inactive),
      source: 'fx_provider',
      provider_key: providerKey,
      provider_request_id: fetched.providerRequestId ?? null,
    });

    return {
      provider_key: providerKey,
      provider_request_id: fetched.providerRequestId ?? null,
      observation: {
        source_currency_code: fetched.value.sourceCurrencyCode,
        target_unit: fetched.value.targetUnit,
        rate_to_toman: fetched.value.rateToToman,
        observed_at: fetched.value.observedAt,
        source_reference: fetched.value.sourceReference ?? null,
      },
      currency_rate: registered,
      preview,
      apply_required: true,
    };
  }
}
