import { IntegrationProviderPort, ProviderRequestContext, ProviderResult } from './provider-contracts';

export interface FxRateRequest {
  sourceCurrencyCode: string;
  targetUnit: 'TOMAN';
}

export interface FxRateObservation {
  sourceCurrencyCode: string;
  targetUnit: 'TOMAN';
  rateToToman: number;
  observedAt: Date;
  sourceReference?: string | null;
}

export interface FxProviderPort extends IntegrationProviderPort {
  readonly kind: 'fx';
  fetchRate(input: FxRateRequest, context: ProviderRequestContext): Promise<ProviderResult<FxRateObservation>>;
}

export function normalizeCurrencyCode(value: string): string {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error('FX_CURRENCY_CODE_INVALID');
  return code;
}

export function validateFxObservation(input: FxRateObservation, expectedCurrencyCode: string, now = new Date(), maxAgeMs = 15 * 60_000): FxRateObservation {
  const sourceCurrencyCode = normalizeCurrencyCode(input.sourceCurrencyCode);
  const expected = normalizeCurrencyCode(expectedCurrencyCode);
  if (sourceCurrencyCode !== expected) throw new Error('FX_CURRENCY_MISMATCH');
  if (input.targetUnit !== 'TOMAN') throw new Error('FX_TARGET_UNIT_INVALID');
  if (!Number.isSafeInteger(input.rateToToman) || input.rateToToman <= 0) throw new Error('FX_RATE_TO_TOMAN_INVALID');
  if (!(input.observedAt instanceof Date) || Number.isNaN(input.observedAt.getTime())) throw new Error('FX_OBSERVED_AT_INVALID');
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 60_000 || maxAgeMs > 86_400_000) throw new Error('FX_MAX_AGE_INVALID');
  const ageMs = now.getTime() - input.observedAt.getTime();
  if (ageMs < -120_000) throw new Error('FX_OBSERVATION_FROM_FUTURE');
  if (ageMs > maxAgeMs) throw new Error('FX_OBSERVATION_STALE');
  const sourceReference = input.sourceReference == null ? null : String(input.sourceReference).trim().slice(0, 300) || null;
  return { sourceCurrencyCode, targetUnit: 'TOMAN', rateToToman: input.rateToToman, observedAt: new Date(input.observedAt), sourceReference };
}
