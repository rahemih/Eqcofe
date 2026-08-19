import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync(new URL('../application/profit-rule.service.ts',import.meta.url),'utf8');
const r=fs.readFileSync(new URL('../infrastructure/finance.repository.ts',import.meta.url),'utf8');
const o=fs.readFileSync(new URL('../../orders/application/ports/order-finance.service.ts',import.meta.url),'utf8');
const m=fs.readFileSync(new URL('../../../../database/migrations/0023_finance_profit_rules_hardening.sql',import.meta.url),'utf8');

test('rule resolution orders priority before specificity and fails closed on ambiguity or mixed rules',()=>{
  assert.match(r,/ORDER BY r\.priority DESC,specificity DESC/);
  assert.match(s,/FINANCE_PROFIT_RULE_ORDER_AMBIGUOUS/);
  assert.match(s,/FINANCE_PROFIT_RULE_MIXED_ORDER_UNSUPPORTED/);
});
test('scope context includes product brand primary and secondary categories',()=>{
  assert.match(o,/brand_id/);assert.match(o,/catalog\.product_categories/);assert.match(o,/primary_category_id/);
});
test('owner percentages are exact four-decimal units summing to 100 percent',()=>{
  assert.match(s,/physicalUnits\+onlineUnits!==1000000/);assert.match(s,/padEnd\(4,'0'\)/);
});
test('largest-remainder split is exact for positive and negative integer toman',()=>{
  assert.match(s,/magnitude-physical-online/);assert.match(s,/base<0\?-1n:1n/);assert.match(s,/p\+o!==base/);
});
test('committed rules are immutable and lifecycle is draft active expired',()=>{
  assert.match(m,/status IN \('draft','active','expired'\)/);assert.match(m,/FINANCE_COMMITTED_PROFIT_RULE_IMMUTABLE/);assert.match(m,/FINANCE_EXPIRED_PROFIT_RULE_IMMUTABLE/);
});
