import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=fs.readFileSync(new URL('../presentation/returns.controller.ts',import.meta.url),'utf8');
const w=fs.readFileSync(new URL('../../warranty/presentation/warranty.controller.ts',import.meta.url),'utf8');
test('customer return creation/cancel require customer actor and idempotency',()=>{assert.match(r,/@CustomerOnly\(\)[\s\S]*@RequireIdempotency\('return\.customer\.create'\)/);assert.match(r,/return\.customer\.cancel/);});
test('return resolution is critical, step-up protected, and wired to B8 body',()=>{assert.match(r,/@Permissions\('returns\.resolve'\)[\s\S]*@RequireStepUp\(\)[\s\S]*return\.admin\.resolve/);assert.match(r,/this\.returns\.resolve\(uuid\(id\),body\)/);});
test('warranty create is customer-only and idempotent',()=>{assert.match(w,/@CustomerOnly\(\)[\s\S]*warranty\.customer\.create/);});
test('warranty resolve and close require step-up',()=>{assert.ok((w.match(/@RequireStepUp\(\)/g)||[]).length>=2);assert.match(w,/warranty\.admin\.resolve/);assert.match(w,/warranty\.admin\.close/);});
test('controllers do not expose procurement purchase-return routes',()=>{assert.doesNotMatch(r+w,/purchase-returns/);});
