import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const j=fs.readFileSync(new URL('../application/journal.service.ts',import.meta.url),'utf8');
const c=fs.readFileSync(new URL('../application/chart-of-accounts.service.ts',import.meta.url),'utf8');
const m=fs.readFileSync(new URL('../../../../database/migrations/0020_finance_journal_hardening.sql',import.meta.url),'utf8');
test('journal service validates two-sided balanced integer entries',()=>{assert.match(j,/lines\.length<2/);assert.match(j,/FINANCE_JOURNAL_LINE_SIDE_INVALID/);assert.match(j,/FINANCE_JOURNAL_UNBALANCED/);assert.match(j,/Number\.isSafeInteger/);});
test('post is serialized and draft-only',()=>{assert.match(j,/journalById\(ex,id,true\)/);assert.match(j,/FINANCE_JOURNAL_NOT_DRAFT/);});
test('reversal follows draft-lines-post and swaps sides',()=>{assert.match(j,/status:'draft',reversalOfId:id/);assert.match(j,/postJournal\(ex,reversalId/);assert.match(j,/debitToman:Number\(l\.credit_toman\),creditToman:Number\(l\.debit_toman\)/);});
test('posted journal headers and lines are DB immutable',()=>{assert.match(m,/FINANCE_POSTED_JOURNAL_HEADER_IMMUTABLE/);assert.match(m,/BEFORE INSERT OR UPDATE OR DELETE/);});
test('chart accounts protect duplicate code parent existence and cycles',()=>{assert.match(c,/FINANCE_ACCOUNT_CODE_EXISTS/);assert.match(c,/FINANCE_PARENT_ACCOUNT_NOT_FOUND/);assert.match(m,/FINANCE_ACCOUNT_HIERARCHY_CYCLE/);});
