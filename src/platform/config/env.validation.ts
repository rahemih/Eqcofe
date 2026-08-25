function int(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function boundedInt(value: unknown, fallback: number, name: string, min: number, max: number): number {
  const parsed = int(value, fallback, name);
  if (parsed < min || parsed > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return parsed;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(raw.NODE_ENV ?? 'development');
  const databaseUrl = String(raw.DATABASE_URL ?? '');
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (nodeEnv === 'production' && (!raw.AUTH_ENCRYPTION_KEY || !raw.OTP_HMAC_SECRET || !raw.AUTH_TOKEN_HMAC_SECRET)) throw new Error('AUTH_ENCRYPTION_KEY, OTP_HMAC_SECRET and AUTH_TOKEN_HMAC_SECRET are required in production');
  if (nodeEnv === 'production' && (!raw.WEBAUTHN_RP_ID || !raw.WEBAUTHN_ORIGIN || !raw.BROWSER_ALLOWED_ORIGINS)) throw new Error('WEBAUTHN_RP_ID, WEBAUTHN_ORIGIN and BROWSER_ALLOWED_ORIGINS are required in production');
  if (nodeEnv === 'production' && (!raw.MEDIA_UPLOAD_BASE_URL || !raw.MEDIA_UPLOAD_SIGNING_SECRET)) throw new Error('MEDIA_UPLOAD_BASE_URL and MEDIA_UPLOAD_SIGNING_SECRET are required in production');
  if (nodeEnv === 'production' && !raw.INTERNAL_SERVICE_BEARER) throw new Error('INTERNAL_SERVICE_BEARER is required in production');
  const paymentsEnabled=bool(raw.PAYMENTS_ENABLED,false);
  if (paymentsEnabled && !raw.PAYMENT_CALLBACK_BASE_URL) throw new Error('PAYMENT_CALLBACK_BASE_URL is required when PAYMENTS_ENABLED=true');
  if (paymentsEnabled && String(raw.PAYMENT_PROVIDER_KEY??'disabled') === 'disabled') throw new Error('PAYMENT_PROVIDER_KEY must name a real provider when PAYMENTS_ENABLED=true');
  if (nodeEnv === 'production' && paymentsEnabled && !raw.PAYMENT_REDIRECT_ALLOWED_HOSTS) throw new Error('PAYMENT_REDIRECT_ALLOWED_HOSTS is required in production when payments are enabled');
  const shippingProviderKey=String(raw.SHIPPING_PROVIDER_KEY??'disabled').trim().toLowerCase();
  const shippingWebhookEnabled=bool(raw.SHIPPING_WEBHOOK_ENABLED,false);
  if(shippingProviderKey!=='disabled'&&!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(shippingProviderKey)) throw new Error('SHIPPING_PROVIDER_KEY is invalid');
  if(shippingWebhookEnabled&&shippingProviderKey==='disabled') throw new Error('SHIPPING_PROVIDER_KEY must name a configured provider when SHIPPING_WEBHOOK_ENABLED=true');
  if(shippingWebhookEnabled&&!raw.SHIPPING_WEBHOOK_HMAC_SECRET) throw new Error('SHIPPING_WEBHOOK_HMAC_SECRET is required when SHIPPING_WEBHOOK_ENABLED=true');
  if(nodeEnv==='production'&&shippingWebhookEnabled&&!raw.SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS) raw.SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS='300';
  const paymentProviderKey=String(raw.PAYMENT_PROVIDER_KEY??'disabled');
  if (paymentsEnabled && paymentProviderKey==='zarinpal' && !raw.ZARINPAL_MERCHANT_ID) throw new Error('ZARINPAL_MERCHANT_ID is required when ZarinPal payments are enabled');

  return {
    ...raw,
    NODE_ENV: nodeEnv,
    SERVICE_NAME: String(raw.SERVICE_NAME ?? 'eqcofe'),
    API_PORT: int(raw.API_PORT, 3000, 'API_PORT'),
    DATABASE_URL: databaseUrl,
    DB_POOL_MAX: boundedInt(raw.DB_POOL_MAX, 20, 'DB_POOL_MAX', 1, 100),
    REDIS_HOST: String(raw.REDIS_HOST ?? '127.0.0.1'),
    REDIS_PORT: int(raw.REDIS_PORT, 6379, 'REDIS_PORT'),
    REDIS_PASSWORD: raw.REDIS_PASSWORD ? String(raw.REDIS_PASSWORD) : undefined,
    OUTBOX_POLL_INTERVAL_MS: boundedInt(raw.OUTBOX_POLL_INTERVAL_MS, 500, 'OUTBOX_POLL_INTERVAL_MS', 100, 60_000),
    OUTBOX_BATCH_SIZE: boundedInt(raw.OUTBOX_BATCH_SIZE, 100, 'OUTBOX_BATCH_SIZE', 1, 500),
    OUTBOX_PROCESSING_TIMEOUT_MS: boundedInt(raw.OUTBOX_PROCESSING_TIMEOUT_MS, 30000, 'OUTBOX_PROCESSING_TIMEOUT_MS', 1_000, 3_600_000),
    OUTBOX_MAX_ATTEMPTS: boundedInt(raw.OUTBOX_MAX_ATTEMPTS, 12, 'OUTBOX_MAX_ATTEMPTS', 1, 100),
    EVENT_PIPELINE_SUMMARY_INTERVAL_MS: boundedInt(raw.EVENT_PIPELINE_SUMMARY_INTERVAL_MS, 60_000, 'EVENT_PIPELINE_SUMMARY_INTERVAL_MS', 10_000, 3_600_000),
    NOTIFICATION_POLL_INTERVAL_MS: boundedInt(raw.NOTIFICATION_POLL_INTERVAL_MS, 500, 'NOTIFICATION_POLL_INTERVAL_MS', 100, 60_000),
    NOTIFICATION_BATCH_SIZE: boundedInt(raw.NOTIFICATION_BATCH_SIZE, 25, 'NOTIFICATION_BATCH_SIZE', 1, 100),
    NOTIFICATION_PROCESSING_TIMEOUT_MS: boundedInt(raw.NOTIFICATION_PROCESSING_TIMEOUT_MS, 300_000, 'NOTIFICATION_PROCESSING_TIMEOUT_MS', 30_000, 3_600_000),
    HEALTH_READINESS_TIMEOUT_MS: boundedInt(raw.HEALTH_READINESS_TIMEOUT_MS, 5_000, 'HEALTH_READINESS_TIMEOUT_MS', 100, 10_000),
    OPENAPI_DOCS_ENABLED: bool(raw.OPENAPI_DOCS_ENABLED, nodeEnv !== 'production'),
    AUTH_ENCRYPTION_KEY: String(raw.AUTH_ENCRYPTION_KEY ?? ''),
    AUTH_TOKEN_HMAC_SECRET: String(raw.AUTH_TOKEN_HMAC_SECRET ?? ''),
    OTP_HMAC_SECRET: String(raw.OTP_HMAC_SECRET ?? ''),
    OTP_TTL_SECONDS: int(raw.OTP_TTL_SECONDS, 120, 'OTP_TTL_SECONDS'),
    SESSION_TTL_SECONDS: int(raw.SESSION_TTL_SECONDS, 604800, 'SESSION_TTL_SECONDS'),
    WEBAUTHN_RP_ID: String(raw.WEBAUTHN_RP_ID ?? 'localhost'),
    WEBAUTHN_ORIGIN: String(raw.WEBAUTHN_ORIGIN ?? 'http://localhost:3000'),
    COOKIE_SECURE: bool(raw.COOKIE_SECURE, nodeEnv === 'production'),
    BROWSER_ALLOWED_ORIGINS: String(raw.BROWSER_ALLOWED_ORIGINS ?? raw.WEBAUTHN_ORIGIN ?? 'http://localhost:3000'),
    FIDO_REQUIRE_HARDWARE_KEY: bool(raw.FIDO_REQUIRE_HARDWARE_KEY, true),
    FIDO_ALLOWED_TRANSPORTS: String(raw.FIDO_ALLOWED_TRANSPORTS ?? 'usb,nfc,ble,smart-card'),
    MEDIA_UPLOAD_BASE_URL: raw.MEDIA_UPLOAD_BASE_URL ? String(raw.MEDIA_UPLOAD_BASE_URL) : undefined,
    MEDIA_UPLOAD_SIGNING_SECRET: raw.MEDIA_UPLOAD_SIGNING_SECRET ? String(raw.MEDIA_UPLOAD_SIGNING_SECRET) : undefined,
    INTERNAL_SERVICE_BEARER: raw.INTERNAL_SERVICE_BEARER ? String(raw.INTERNAL_SERVICE_BEARER) : undefined,
    CART_TTL_HOURS: int(raw.CART_TTL_HOURS, 168, 'CART_TTL_HOURS'),
    CART_ACCESS_TOKEN_MAX_ACTIVE: int(raw.CART_ACCESS_TOKEN_MAX_ACTIVE, 5, 'CART_ACCESS_TOKEN_MAX_ACTIVE'),
    CHECKOUT_TTL_MINUTES: int(raw.CHECKOUT_TTL_MINUTES, 15, 'CHECKOUT_TTL_MINUTES'),
    RESERVATION_TTL_MINUTES: int(raw.RESERVATION_TTL_MINUTES, 15, 'RESERVATION_TTL_MINUTES'),
    ORDER_PENDING_TTL_MINUTES: int(raw.ORDER_PENDING_TTL_MINUTES, 30, 'ORDER_PENDING_TTL_MINUTES'),
    GUEST_ORDER_ACCESS_TTL_DAYS: int(raw.GUEST_ORDER_ACCESS_TTL_DAYS, 7, 'GUEST_ORDER_ACCESS_TTL_DAYS'),
    PAYMENTS_ENABLED: paymentsEnabled,
    PAYMENT_PROVIDER_KEY: paymentProviderKey,
    PAYMENT_CALLBACK_BASE_URL: raw.PAYMENT_CALLBACK_BASE_URL ? String(raw.PAYMENT_CALLBACK_BASE_URL) : undefined,
    PAYMENT_REDIRECT_ALLOWED_HOSTS: String(raw.PAYMENT_REDIRECT_ALLOWED_HOSTS ?? ''),
    PAYMENT_RECONCILIATION_MAX_ATTEMPTS: boundedInt(raw.PAYMENT_RECONCILIATION_MAX_ATTEMPTS,8,'PAYMENT_RECONCILIATION_MAX_ATTEMPTS',1,100),
    ZARINPAL_MERCHANT_ID: raw.ZARINPAL_MERCHANT_ID ? String(raw.ZARINPAL_MERCHANT_ID) : undefined,
    ZARINPAL_SANDBOX: bool(raw.ZARINPAL_SANDBOX,nodeEnv!=='production'),
    ZARINPAL_REVERSE_ENABLED: bool(raw.ZARINPAL_REVERSE_ENABLED,false),
    ZARINPAL_TIMEOUT_MS: boundedInt(raw.ZARINPAL_TIMEOUT_MS,10000,'ZARINPAL_TIMEOUT_MS',100,120_000),
    SHIPPING_PROVIDER_KEY: shippingProviderKey,
    SHIPPING_WEBHOOK_ENABLED: shippingWebhookEnabled,
    SHIPPING_WEBHOOK_HMAC_SECRET: raw.SHIPPING_WEBHOOK_HMAC_SECRET ? String(raw.SHIPPING_WEBHOOK_HMAC_SECRET) : undefined,
    SHIPPING_WEBHOOK_SIGNATURE_HEADER: String(raw.SHIPPING_WEBHOOK_SIGNATURE_HEADER ?? 'x-eqcofe-signature').toLowerCase(),
    SHIPPING_WEBHOOK_TIMESTAMP_HEADER: String(raw.SHIPPING_WEBHOOK_TIMESTAMP_HEADER ?? 'x-eqcofe-timestamp').toLowerCase(),
    SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS: int(raw.SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS,300,'SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS'),
    SHIPPING_PROVIDER_BASE_URL: raw.SHIPPING_PROVIDER_BASE_URL ? String(raw.SHIPPING_PROVIDER_BASE_URL) : undefined,
    SHIPPING_PROVIDER_API_TOKEN: raw.SHIPPING_PROVIDER_API_TOKEN ? String(raw.SHIPPING_PROVIDER_API_TOKEN) : undefined,
    SHIPPING_PROVIDER_TIMEOUT_MS: boundedInt(raw.SHIPPING_PROVIDER_TIMEOUT_MS,10000,'SHIPPING_PROVIDER_TIMEOUT_MS',100,120_000),
  };
}
