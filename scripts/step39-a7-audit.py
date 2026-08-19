from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
env=(root/'src/platform/config/env.validation.ts').read_text()
prov=(root/'src/modules/fulfillment/infrastructure/configured-shipping.provider.ts').read_text()
reg=(root/'src/modules/fulfillment/application/ports/shipping-provider.registry.ts').read_text()
svc=(root/'src/modules/fulfillment/application/shipment.service.ts').read_text()
checks={
'provider env key':'SHIPPING_PROVIDER_KEY' in env,
'webhook enabled env':'SHIPPING_WEBHOOK_ENABLED' in env,
'webhook secret required':'SHIPPING_WEBHOOK_HMAC_SECRET is required' in env,
'signature header config':'SHIPPING_WEBHOOK_SIGNATURE_HEADER' in env,
'timestamp skew config':'SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS' in env,
'hmac sha256':"createHmac('sha256'" in prov,
'constant time compare':'timingSafeEqual' in prov,
'raw body signed':"update(input.rawBody)" in prov,
'stale timestamp rejected':'SHIPPING_WEBHOOK_TIMESTAMP_INVALID' in prov,
'refresh timeout':'AbortSignal.timeout' in prov,
'bearer token':'authorization:`Bearer' in prov,
'unknown normalized fail-safe':"return map[s]??'unknown'" in prov,
'registry auto-register configured provider':'this.register(configured)' in reg,
'future tracking rejected':'SHIPPING_TRACKING_TIME_INVALID' in svc,
'webhook replay conflict':'SHIPPING_WEBHOOK_EVENT_CONFLICT' in svc,
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
