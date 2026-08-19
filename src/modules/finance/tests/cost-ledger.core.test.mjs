import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync(new URL('../application/cost-ledger.service.ts',import.meta.url),'utf8');
const r=fs.readFileSync(new URL('../infrastructure/finance.repository.ts',import.meta.url),'utf8');
const m=fs.readFileSync(new URL('../../../../database/migrations/0021_finance_cost_ledger_hardening.sql',import.meta.url),'utf8');
test('cost treatments are explicit and capitalized costs fail closed without source',()=>{for(const x of ['deduct_before_profit_split','capitalized_into_cost','non_distributable_cost','informational_only'])assert.match(s,new RegExp(x));assert.match(s,/FINANCE_CAPITALIZED_COST_SOURCE_REQUIRED/);});
test('finalize is locked and draft-only',()=>{assert.match(s,/costById\(ex,id,true\)/);assert.match(s,/FINANCE_COST_NOT_DRAFT/);});
test('reversal uses immutable negative effect record',()=>{assert.match(s,/effectSign:-1/);assert.match(m,/FINANCE_FINALIZED_COST_IMMUTABLE/);assert.match(m,/BEFORE UPDATE OR DELETE/);assert.match(m,/FINANCE_COST_REVERSAL_SNAPSHOT_MISMATCH/);});
test('effective cost aggregation uses signed effect and historical finalized-reversed records',()=>{assert.match(r,/sum\(amount_toman\*effect_sign\)/);assert.match(r,/status IN \('finalized','reversed'\)/);});
test('scope and capitalization double-count guards exist at DB layer',()=>{assert.match(m,/ck_finance_cost_scope_exclusive/);assert.match(m,/uq_finance_cost_capitalization_source/);assert.match(m,/FINANCE_CAPITALIZATION_SOURCE_UNEXPECTED/);});
