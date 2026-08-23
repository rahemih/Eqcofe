import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/modules/analytics/infrastructure/analytics-authoritative-source.reader.ts','utf8');
const consumer = readFileSync('src/modules/analytics/application/analytics-cross-domain.consumer.ts','utf8');
const moduleSource = readFileSync('src/modules/analytics/analytics.module.ts','utf8');

function includesAll(text:string, needles:string[]){ for(const n of needles) assert.ok(text.includes(n),`missing ${n}`); }

test('Step 51 A3 derives sales from authoritative Orders and Payments state',()=>{
  includesAll(source,['FROM orders.orders o','LEFT JOIN payments.payments p','payments.refunds','paid_sales_toman']);
  assert.ok(!consumer.includes('gross_sales_toman:event'));
});

test('Step 51 A3 derives inventory from Inventory-owned stock balances',()=>{
  includesAll(source,['inventory.stock_balances','inventory.warehouses','sb.on_hand-sb.reserved-sb.allocated-sb.damaged-sb.quarantine']);
});

test('Step 51 A3 derives customer lifetime metrics from canonical order/payment records',()=>{
  includesAll(source,['WHERE o.customer_id=${customerId}::uuid','lifetime_value_toman','last_order_at']);
});

test('Step 51 A3 consumes Finance-owned profit snapshots instead of recalculating COGS rules',()=>{
  includesAll(source,['finance.profit_calculations','pc.is_current=true','profit_before_distribution_toman']);
  assert.ok(!source.includes('cost_layers'));
});

test('Step 51 A3 uses finance profit events to avoid racing Finance cross-domain calculation',()=>{
  includesAll(consumer,["'finance.profit.calculated.v1'","event.event_type.startsWith('finance.profit.')"]);
  assert.ok(!consumer.includes("event.event_type==='payment.paid.v1' && this.source.profitDaily"));
});

test('Step 51 A3 remains read-side only and registers through canonical event inbox registry',()=>{
  includesAll(consumer,['implements EventConsumer','registry.register(this)','repository.upsertSalesDaily','repository.upsertInventorySnapshot']);
  includesAll(moduleSource,['AnalyticsCrossDomainConsumer','AnalyticsAuthoritativeSourceReader']);
  assert.ok(!source.match(/\b(INSERT|UPDATE|DELETE)\b/i));
  assert.ok(!consumer.includes('OutboxWriter'));
});
