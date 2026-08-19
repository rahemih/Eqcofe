from pathlib import Path
import sys,re,yaml,json,subprocess
c=int(sys.argv[1]);R=Path('.')
svc=(R/'src/modules/payments/application/payment.service.ts').read_text();ctl=(R/'src/modules/payments/presentation/payments.controller.ts').read_text();m13=(R/'database/migrations/0013_payment_financial_hardening.sql').read_text();ord=(R/'src/modules/orders/application/ports/order-payment.service.ts').read_text();types=(R/'src/modules/payments/domain/payment.types.ts').read_text();env=(R/'src/platform/config/env.validation.ts').read_text();api=yaml.safe_load((R/'contracts/http/openapi.yaml').read_text());issues=[]
def q(x,m):
 if not x: issues.append(m)
# shared every cycle
q('this.provider.' not in svc,'legacy single provider');q('provider_message' not in svc,'provider message leak');q('rawBody??Buffer.from' not in svc,'reconstructed webhook raw body');q('claimSettlement' in svc,'settlement claim missing');q('markPaymentAttemptFailed' in ord,'old attempt projection guard missing');q('FOR UPDATE' in m13 and 'assert_refund_cap' in m13,'refund serial cap missing');q('manual_review_required' in svc,'manual review missing');q('reconciliation_attempts' in svc,'reconcile cap missing');q('callback_state_consumed_at' in svc,'callback replay missing');
# targeted
if c==1:
 q("duplicate_order_payment" in svc,'double charge branch');q("cancelled_order_payment" in svc,'cancelled payment compensation');q("late_payment_stock_unavailable" in svc,'late payment compensation');q("ux_payments_order_inflight" in m13,'inflight index');q("DROP INDEX IF EXISTS payments.ux_payments_order_live" in m13,'legacy live index')
elif c==2:
 q('PAYMENT_WEBHOOK_RAW_BODY_REQUIRED' in svc,'raw webhook');q("await this.checkProvider(String(pay.id),'verify')" in svc,'webhook server verify');q('PAYMENT_AMOUNT_MISMATCH' in svc,'amount verify');q('validateRedirect' in svc,'redirect allowlist');q("@UseGuards(PaymentOrderAccessGuard)" in ctl,'auth before idempotency')
elif c==3:
 q('withProviderLease' in svc,'payment lease');q('withRefundLease' in svc,'refund lease');q('PAYMENT_PROVIDER_REFERENCE_CONFLICT' in svc,'provider ref claim');q('provider_check_until' in m13,'lease db');q('source!==\'reconcile\'' in svc or "source!=='reconcile'" in svc,'late resurrection check')
elif c==4:
 q("['requested','approved','failed']" in svc,'unsafe refund cancel');q('REFUND_SEPARATION_OF_DUTIES' in svc,'refund sod');q('auditRefund' in svc,'refund audit');q("status='processing',submitted_at=COALESCE(submitted_at,now())" in svc,'refund checkpoint');q("status IN ('requested','approved','processing','succeeded','unknown','failed')" in m13,'failed refund cap reserve')
elif c==5:
 q('PaymentProviderRegistry' in types,'registry contract');q('this.providers.resolve(String(p.provider_key))' in svc,'historical provider resolution');q('reconcileRefund' in svc,'refund reconciliation');q('maxReconcile' in svc and 'backoff' in svc,'bounded backoff');q("reason_code IN ('cancelled_order_payment','duplicate_order_payment','late_payment_stock_unavailable')" in svc,'automatic mandatory refund processing')
elif c==6:
 q('isSettlement' in svc,'settlement-aware refund projection');q('settlement_payment_id IS NULL' in ord,'failed attempt preserves settlement');q('BUSINESS_STOCK_ERRORS.has(e.code)' in svc,'technical stock errors not auto-refunded');q('orders.confirmPaid' in svc,'order confirmation');q('inventory.convert' in svc,'reservation conversion')
elif c==7:
 ids=[]
 for path,item in api['paths'].items():
  for meth,op in item.items():
   if meth in {'get','post','put','patch','delete'} and op.get('operationId'): ids.append(op['operationId'])
 q(len(ids)==len(set(ids)),'duplicate operationId');q('/admin/refunds/{id}/reconcile' in api['paths'],'refund reconcile OpenAPI');q(any(x.get('name')=='state' for x in api['paths']['/payments/{payment_id}/callback']['post']['parameters'] if isinstance(x,dict)),'callback state OpenAPI');q(api['components']['schemas']['PaymentResponse']['properties'].get('manual_review_required') is not None,'payment response manual flag')
elif c==8:
 names=['payment.initiated.v1','payment.paid.v1','payment.failed.v1','payment.late_received.v1','refund.approved.v1','refund.requested.v1','refund.completed.v1','refund.failed.v1','payment.partially_refunded.v1','payment.refunded.v1']
 for n in names:q((R/'contracts/events'/f'{n}.schema.json').exists(),f'missing event {n}')
 q('additionalProperties' in json.loads((R/'contracts/events/refund.approved.v1.schema.json').read_text()),'strict refund approved schema');q('provider_message' not in svc,'provider pii')
elif c==9:
 q('PAYMENT_REDIRECT_ALLOWED_HOSTS' in env,'redirect env');q('PAYMENT_RECONCILIATION_MAX_ATTEMPTS' in env,'attempt env');q('PAYMENTS_ENABLED' in env,'payment gate');q('PaymentsModule' in (R/'apps/scheduler/app.module.ts').read_text(),'scheduler DI');q('runPaymentReconciliation' in (R/'apps/scheduler/scheduler-tasks.service.ts').read_text(),'scheduler job')
elif c==10:
 q(not (R/'dist').exists(),'stale dist');
 for f in R.rglob('*.ts'):
  if f.name.endswith('.d.ts'):continue
  txt=f.read_text(errors='ignore');q('_irr' not in txt,f'IRR field {f}');q('wallet' not in txt.lower() or 'loyalty' in str(f).lower(),f'wallet ref {f}')
# basic relative import resolution for payment scope
for f in list((R/'src/modules/payments').rglob('*.ts'))+[R/'src/modules/orders/application/ports/order-payment.service.ts']:
 t=f.read_text()
 for imp in re.findall(r"from ['\"](\.[^'\"]+)['\"]",t):
  base=(f.parent/imp)
  if not any(Path(str(base)+s).exists() for s in ['.ts','.tsx','/index.ts']) and not base.exists(): issues.append(f'broken import {f}:{imp}')
if issues:
 print(json.dumps({'cycle':c,'status':'FAIL','issues':issues},ensure_ascii=False,indent=2));sys.exit(1)
print(json.dumps({'cycle':c,'status':'PASS','target':['financial-state','security','concurrency','refunds','providers-reconciliation','order-inventory','openapi-http','events-forensics','di-config','full-regression'][c-1]},ensure_ascii=False))
