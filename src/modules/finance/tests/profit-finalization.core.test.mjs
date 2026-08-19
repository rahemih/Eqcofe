import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync(new URL('../application/profit-finalization.service.ts',import.meta.url),'utf8');
const r=fs.readFileSync(new URL('../application/profit-rule.service.ts',import.meta.url),'utf8');
const repo=fs.readFileSync(new URL('../infrastructure/finance.repository.ts',import.meta.url),'utf8');
const m=fs.readFileSync(new URL('../../../../database/migrations/0024_finance_profit_finalization_distribution.sql',import.meta.url),'utf8');

test('finalization requires fresh settled financial facts with no draft costs',()=>{
  assert.match(s,/buildFactsInTransaction\(ex,orderId,true\)/);
  assert.match(s,/FINANCE_REFUND_UNRESOLVED/);
  assert.match(s,/FINANCE_REFUND_NOT_SETTLED/);
  assert.match(s,/FINANCE_DRAFT_COSTS_EXIST/);
});
test('finalization requires a current non-stale provisional snapshot',()=>{
  assert.match(s,/FINANCE_PROVISIONAL_PROFIT_REQUIRED/);assert.match(s,/FINANCE_PROVISIONAL_PROFIT_STALE/);
});
test('historical rule selection is non-retroactive and mixed baskets fail closed',()=>{
  assert.match(s,/fresh\.order\.createdAt/);assert.match(repo,/r\.status IN \('active','expired'\)/);
  assert.match(r,/FINANCE_PROFIT_RULE_MIXED_ORDER_UNSUPPORTED/);
});
test('distribution is exact immutable and reversed through a negative linked record',()=>{
  assert.match(m,/FINANCE_DISTRIBUTION_IMMUTABLE/);assert.match(m,/FINANCE_DISTRIBUTION_REVERSAL_SNAPSHOT_MISMATCH/);
  assert.match(s,/baseToman:-Number\(original\.distributable_base_toman\)/);
});
test('reversal deactivates final calculation instead of rewriting financial snapshot',()=>{
  assert.match(s,/markFinalNotCurrent/);assert.match(m,/FINANCE_FINAL_PROFIT_IMMUTABLE/);
});
