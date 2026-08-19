from pathlib import Path
import json,yaml,re,sys
from jsonschema import Draft202012Validator
root=Path('.')
issues=[]
def req(cond,msg):
    if not cond: issues.append(msg)
svc=(root/'src/modules/payments/application/payment.service.ts').read_text()
ctl=(root/'src/modules/payments/presentation/payments.controller.ts').read_text()
mig12=(root/'database/migrations/0012_payment_engine.sql').read_text()
mig13=(root/'database/migrations/0013_payment_financial_hardening.sql').read_text()
ord=(root/'src/modules/orders/application/ports/order-payment.service.ts').read_text()
module=(root/'src/modules/payments/payments.module.ts').read_text()
env=(root/'src/platform/config/env.validation.ts').read_text()
err=(root/'src/platform/http/global-exception.filter.ts').read_text()
scheduler=(root/'apps/scheduler/app.module.ts').read_text()+(root/'apps/scheduler/scheduler-tasks.service.ts').read_text()
# money/db
req('PAYMENT_ORDER_AMOUNT_MISMATCH' in mig12,'payment/order amount invariant missing')
req('FOR UPDATE' in mig13 and 'assert_refund_cap' in mig13,'refund cap lacks serialization lock')
req("status IN ('requested','approved','processing','succeeded','unknown','failed')" in mig13,'refund failed amount not reserved')
req('settlement_payment_id' in mig13 and 'claimSettlement' in svc,'settlement ownership missing')
req('ux_payments_order_inflight' in mig13,'inflight uniqueness missing')
req('DROP INDEX IF EXISTS payments.ux_payments_order_live' in mig13,'legacy live unique index not removed')
req('provider_check_until' in mig13,'provider lease columns missing')
req('REFUND_SUBMISSION_REQUIRED' in mig13 and 'REFUND_COMPLETION_REQUIRED' in mig13,'refund lifecycle DB guards missing')
# financial state/race
for token in ['duplicate_order_payment','cancelled_order_payment','late_payment_stock_unavailable','claimProviderReference','withProviderLease','withRefundLease','markPaymentAttemptFailed','isSettlement']:
    req(token in svc,f'missing financial hardening: {token}')
req("['requested','approved','failed']" in svc,'unknown/processing refund appears cancellable')
req('BUSINESS_STOCK_ERRORS.has(e.code)' in svc,'technical inventory error may auto-refund')
req('source!==\'reconcile\'' in svc or "source!=='reconcile'" in svc,'failed payment late-resurrection reconciliation missing')
req("status='pending',reconciliation_required=false" in svc,'pending reconciliation does not normalize state')
# security/callback/webhook
for token in ['callback_state_hash','callback_state_consumed_at','PAYMENT_WEBHOOK_RAW_BODY_REQUIRED','validateRedirect','PAYMENT_AMOUNT_MISMATCH']:
    req(token in svc,f'missing security hardening: {token}')
req("@Query('state')" in ctl,'callback state not accepted by controller')
req("await this.checkProvider(String(pay.id),'verify')" in svc,'webhook trusts callback instead of server verify')
req('parsed.status' not in svc,'webhook provider payload status is trusted directly')
req('rawBody??Buffer.from' not in svc,'webhook raw body is reconstructed')
req('PAYMENT_PROVIDER_REGISTRY' in module,'provider registry DI missing')
req('PAYMENT_REDIRECT_ALLOWED_HOSTS' in env,'provider redirect allowlist config missing')
req('PAYMENT_RECONCILIATION_MAX_ATTEMPTS' in env,'reconciliation attempt cap config missing')
# auth/idempotency/audit
for token in ["@RequireIdempotency('refund.create')","@RequireIdempotency('refund.approve')","@RequireIdempotency('refund.reject')","@RequireIdempotency('refund.process')","@RequireIdempotency('refund.retry')","@RequireIdempotency('refund.reconcile')","@RequireIdempotency('refund.cancel')"]:
    req(token in ctl,f'missing idempotency: {token}')
req('PaymentOrderAccessGuard' in ctl and '@UseGuards(PaymentOrderAccessGuard)' in ctl,'guest initiate auth is not before idempotency interceptor')
req('REFUND_SEPARATION_OF_DUTIES' in svc,'refund separation of duties missing')
req('auditRefund' in svc,'refund audit trail missing')
req('provider_message' not in svc,'raw provider message still exposed/persisted in service')
req('DROP COLUMN IF EXISTS provider_message' in mig13,'legacy provider message column not dropped')
# reconciliation
for token in ['reconciliation_attempts','manual_review_required','next_reconciliation_at','maxReconcile','backoff','reconcileRefund']:
    req(token in svc,f'missing reconciliation control: {token}')
req('ix_payments_reconcile_due' in mig13 and 'ix_refunds_reconcile_due' in mig13,'reconciliation due indexes missing')
req('PaymentsModule' in scheduler and 'runPaymentReconciliation' in scheduler,'scheduler payment reconciliation missing')
# HTTP semantics
for token in ['PAYMENT_PROVIDER_UNAVAILABLE','PAYMENTS_DISABLED','PAYMENT_PROVIDER_CHECK_IN_PROGRESS','PAYMENT_CALLBACK_STATE_INVALID']:
    req(token in err,f'HTTP mapping missing: {token}')
# OpenAPI
api=yaml.safe_load((root/'contracts/http/openapi.yaml').read_text())
ops=[]
for path,item in api.get('paths',{}).items():
    for method,op in item.items():
        if method.lower() in {'get','post','put','patch','delete','head','options'}:
            ops.append((path,method.lower(),op))
ids=[op.get('operationId') for _,_,op in ops if op.get('operationId')]
req(len(ids)==len(set(ids)),'duplicate operationId')
# local refs
refs=[]
def walk(x):
    if isinstance(x,dict):
        if '$ref' in x and isinstance(x['$ref'],str) and x['$ref'].startswith('#/'): refs.append(x['$ref'])
        for v in x.values(): walk(v)
    elif isinstance(x,list):
        for v in x: walk(v)
walk(api)
for ref in refs:
    cur=api
    try:
        for part in ref[2:].split('/'): cur=cur[part.replace('~1','/').replace('~0','~')]
    except Exception: issues.append('broken ref '+ref)
cb=api['paths']['/payments/{payment_id}/callback']['post']
req(any(x.get('name')=='state' and x.get('required') for x in cb.get('parameters',[]) if isinstance(x,dict)),'callback state missing in OpenAPI')
req('/admin/refunds/{id}/reconcile' in api['paths'],'refund reconcile route missing OpenAPI')
for path in ['/admin/refunds/{id}/reject','/admin/refunds/{id}/process','/admin/refunds/{id}/retry','/admin/refunds/{id}/reconcile','/admin/refunds/{id}/cancel','/admin/payments/{id}/reconcile']:
    op=api['paths'][path]['post']; req(any(x.get('$ref')=='#/components/parameters/IdempotencyKey' for x in op.get('parameters',[]) if isinstance(x,dict)),f'OpenAPI idempotency missing {path}')
# event schemas strict + valid
for f in (root/'contracts/events').glob('*.schema.json'):
    try:
        d=json.loads(f.read_text());Draft202012Validator.check_schema(d)
    except Exception as e: issues.append(f'invalid event schema {f.name}: {e}')
for name in ['payment.initiated.v1','payment.paid.v1','payment.failed.v1','payment.late_received.v1','refund.approved.v1','refund.requested.v1','refund.completed.v1','refund.failed.v1','payment.partially_refunded.v1','payment.refunded.v1']:
    req((root/'contracts/events'/f'{name}.schema.json').exists(),f'missing event schema {name}')
# no stale build artifact
req(not (root/'dist').exists(),'stale dist directory exists')
# basic TS intrinsic error patterns
req('this.provider.' not in svc,'legacy single-provider dependency remains')
if issues:
    print(json.dumps({'status':'FAIL','issues':issues},ensure_ascii=False,indent=2));sys.exit(1)
print(json.dumps({'status':'PASS','checks':'step38-financial-hardened','openapi_paths':len(api['paths']),'openapi_operations':len(ops),'local_refs':len(refs),'event_schemas':len(list((root/'contracts/events').glob('*.schema.json')))},ensure_ascii=False))
