import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ExcelAdminService } from '../src/modules/excel/application/excel-admin.service';
import { DomainError } from '../src/shared/errors/domain-error';

const controller = readFileSync('src/modules/excel/presentation/excel-admin.controller.ts', 'utf8');
const serviceSource = readFileSync('src/modules/excel/application/excel-admin.service.ts', 'utf8');
const migration = readFileSync('database/migrations/0057_excel_rbac_audit_api.sql', 'utf8');
const contract = readFileSync('contracts/http/openapi-step50-a8.yaml', 'utf8');
const validator = readFileSync('scripts/validate-openapi.mjs', 'utf8');
const moduleSource = readFileSync('src/modules/excel/excel.module.ts', 'utf8');

test('Step 50 A8 admin Excel surface is staff-only with explicit RBAC separation', () => {
  assert.match(controller, /@Controller\('admin\/excel'\)[\s\S]*@StaffOnly\(\)/);
  for (const permission of ['excel.view', 'excel.import', 'excel.apply', 'excel.recover']) {
    assert.match(controller, new RegExp(`@Permissions\\('${permission.replace('.', '\\.')}\\'`));
    assert.match(migration, new RegExp(`'${permission.replace('.', '\\.')}'`));
  }
  assert.doesNotMatch(controller, /@Public\(/);
});

test('Step 50 A8 apply and recovery require both step-up and idempotency', () => {
  for (const scope of ['excel.catalog.apply', 'excel.pricing.apply', 'excel.import.recover']) {
    assert.match(controller, new RegExp(`@RequireStepUp\\(\\)[\\s\\S]{0,180}@RequireIdempotency\\('${scope.replaceAll('.', '\\.')}\\'`));
  }
  assert.match(controller, /@RequireIdempotency\('excel\.import\.create'\)/);
});

test('Step 50 A8 preview dry-run and template stay non-mutating read boundaries', () => {
  assert.match(controller, /@Get\('exports\/template'\)/);
  assert.match(controller, /@Post\('dry-run'\)/);
  assert.match(controller, /@Post\('catalog\/preview'\)/);
  assert.match(controller, /@Post\('pricing\/preview'\)/);
  assert.doesNotMatch(serviceSource, /sql`|INSERT INTO|UPDATE catalog\.|UPDATE pricing\./i);
});

test('Step 50 A8 audit metadata excludes raw workbook payload', () => {
  assert.match(serviceSource, /fingerprint/);
  assert.match(serviceSource, /affected_count/);
  assert.doesNotMatch(serviceSource, /afterData:\s*\{[^}]*sheets|afterData:\s*workbook|beforeData:\s*workbook/i);
  assert.match(serviceSource, /action,\s*resourceType/);
});

test('Step 50 A8 application boundary rejects non-staff actors before orchestration', () => {
  const ctx: any = { get: () => ({ actor: { type: 'customer', id: '11111111-1111-4111-8111-111111111111' } }) };
  const noop: any = {};
  const service = new ExcelAdminService(noop, { build: () => ({}) } as any, noop, noop, noop, noop, noop, noop, ctx);
  assert.throws(
    () => service.exportTemplate(),
    (error: unknown) => error instanceof DomainError && error.code === 'EXCEL_STAFF_REQUIRED',
  );
});

test('Step 50 A8 RBAC migration is additive and risk-classifies apply/recovery as critical', () => {
  assert.match(migration, /ON CONFLICT \(key\) DO NOTHING/);
  assert.match(migration, /'excel\.apply'[\s\S]*'critical'/);
  assert.match(migration, /'excel\.recover'[\s\S]*'critical'/);
  assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE|TRUNCATE|UPDATE admin\.permissions/i);
});

test('Step 50 A8 OpenAPI overlay covers all staff operations and sensitive controls', () => {
  for (const path of ['exports/template', 'dry-run', 'catalog/preview', 'pricing/preview', 'imports', 'catalog/apply', 'pricing/apply', 'imports/{id}/recover']) {
    assert.match(contract, new RegExp(`/admin/excel/${path.replace(/[{}]/g, '\\$&')}:`));
  }
  assert.match(contract, /stepUpToken: \[\]/);
  assert.match(contract, /IdempotencyKey/);
  assert.match(contract, /permission: excel\.apply/);
  assert.match(contract, /permission: excel\.recover/);
  assert.match(validator, /openapi-.+\\\.yaml/);
});

test('Step 50 A8 module registers admin API without gaining unrelated commerce authority', () => {
  assert.match(moduleSource, /controllers: \[ExcelAdminController\]/);
  assert.match(moduleSource, /ExcelAdminService/);
  assert.doesNotMatch(moduleSource, /InventoryModule|PaymentsModule|FinanceModule|OrdersModule/);
  assert.doesNotMatch(serviceSource, /Inventory|Payments|Finance|Orders/);
});
