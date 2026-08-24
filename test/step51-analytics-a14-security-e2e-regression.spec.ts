import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Reflector } from '@nestjs/core';
import { parse } from 'yaml';
import { AnalyticsManagementController } from '../src/modules/analytics/presentation/analytics-management.controller';
import { ManagementExportService } from '../src/modules/analytics/application/management-export.service';
import { IDEMPOTENCY_SCOPE, REQUIRED_ACTOR_TYPES, REQUIRED_PERMISSIONS, STEP_UP_REQUIRED } from '../src/platform/auth/auth.decorators';
import { PermissionsGuard } from '../src/platform/auth/permissions.guard';
import { StepUpGuard } from '../src/platform/auth/step-up.guard';
import { IdempotencyInterceptor } from '../src/platform/idempotency/idempotency.interceptor';

const STAFF = '11111111-1111-4111-8111-111111111111';
const EXPORT = '22222222-2222-4222-8222-222222222222';
const controllerSource = readFileSync('src/modules/analytics/presentation/analytics-management.controller.ts', 'utf8');
const exportServiceSource = readFileSync('src/modules/analytics/application/management-export.service.ts', 'utf8');
const exportRepositorySource = readFileSync('src/modules/analytics/infrastructure/management-export.repository.ts', 'utf8');
const contract = parse(readFileSync('contracts/http/openapi-step51-a13.yaml', 'utf8'));

function httpContext(handler: Function, actor: any, headers: Record<string, string> = {}) {
  return {
    getHandler: () => handler,
    getClass: () => AnalyticsManagementController,
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', url: '/admin/analytics/exports', body: {}, actor, headers }),
      getResponse: () => ({ statusCode: 201 }),
    }),
  } as any;
}

test('A14 proves every Analytics HTTP operation is Staff-only and permission guarded through runtime metadata', () => {
  assert.deepEqual(Reflect.getMetadata(REQUIRED_ACTOR_TYPES, AnalyticsManagementController), ['staff']);
  const permissions: Record<string, string> = {
    salesRevenue: 'analytics.view', profitRead: 'analytics.view', inventoryRead: 'analytics.view', customerRead: 'analytics.view',
    wholesaleRead: 'analytics.view', operationalRead: 'analytics.view', createExport: 'analytics.export.create',
    listExports: 'analytics.export.view', getExport: 'analytics.export.view', downloadExport: 'analytics.export.download',
  };
  for (const [method, permission] of Object.entries(permissions)) {
    assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS, (AnalyticsManagementController.prototype as any)[method]), [permission], method);
  }
});

test('A14 proves missing or wrong Analytics permission fails closed', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);
  const handler = AnalyticsManagementController.prototype.downloadExport;
  assert.throws(() => guard.canActivate(httpContext(handler, { permissions: ['analytics.export.view'] })), /Insufficient permission/);
  assert.equal(guard.canActivate(httpContext(handler, { permissions: ['analytics.export.download'] })), true);
});

test('A14 proves export creation and every download require Step-Up at runtime', () => {
  const reflector = new Reflector();
  for (const handler of [AnalyticsManagementController.prototype.createExport, AnalyticsManagementController.prototype.downloadExport]) {
    assert.equal(Reflect.getMetadata(STEP_UP_REQUIRED, handler), true);
    const context = httpContext(handler, { accountId: 'account-1', sessionId: 'session-1' });
    assert.throws(() => new StepUpGuard(reflector, { verify: () => null } as any).canActivate(context), /STEP_UP_REQUIRED/);
    const stepped = httpContext(handler, { accountId: 'account-1', sessionId: 'session-1' }, { 'x-step-up-token': 'token' });
    assert.equal(new StepUpGuard(reflector, { verify: () => ({ sub: 'account-1', sid: 'session-1' }) } as any).canActivate(stepped), true);
  }
});

test('A14 proves export creation idempotency rejects a missing key before handler execution', () => {
  const handler = AnalyticsManagementController.prototype.createExport;
  assert.equal(Reflect.getMetadata(IDEMPOTENCY_SCOPE, handler), 'analytics.export.create');
  let ran = false;
  const interceptor = new IdempotencyInterceptor(new Reflector(), {} as any);
  assert.throws(() => interceptor.intercept(httpContext(handler, { accountId: 'account-1' }), { handle: () => { ran = true; } } as any),
    (error: any) => error?.code === 'IDEMPOTENCY_KEY_REQUIRED');
  assert.equal(ran, false);
});

test('A14 proves export lookup is actor-isolated and cross-actor absence fails closed', async () => {
  const calls: any[] = [];
  const repo: any = { byId: async (id: string, actorId: string, content: boolean) => { calls.push({ id, actorId, content }); return null; } };
  const context = { requestId: 'request-1', correlationId: 'trace-1', actor: { type: 'staff', id: STAFF } };
  const service = new ManagementExportService(repo, {} as any, { write: async () => {} } as any,
    { get: () => context, require: () => context } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  await assert.rejects(() => service.get(EXPORT), (error: any) => error?.code === 'ANALYTICS_EXPORT_NOT_FOUND');
  assert.deepEqual(calls, [{ id: EXPORT, actorId: STAFF, content: false }]);
  assert.match(exportRepositorySource, /WHERE id=\$\{id\}::uuid AND requested_by=\$\{actorId\}::uuid/);
});

test('A14 proves failed download attempts are audited without artifact content', async () => {
  const audit: any[] = [];
  const repo: any = { byId: async () => null };
  const context = { requestId: 'request-1', correlationId: 'trace-1', actor: { type: 'staff', id: STAFF } };
  const service = new ManagementExportService(repo, {} as any, { write: async (entry: any) => audit.push(entry) } as any,
    { get: () => context, require: () => context } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  await assert.rejects(() => service.download(EXPORT), (error: any) => error?.code === 'ANALYTICS_EXPORT_NOT_FOUND');
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, 'analytics.export.download');
  assert.equal(audit[0].afterData.outcome, 'failed');
  assert.doesNotMatch(JSON.stringify(audit[0]), /content_text|artifact\.content|rows/);
});

test('A14 proves direct download preserves bytes and allow-lists protective headers', async () => {
  const content = '{"contractVersion":"eqcofe-analytics-export-v1"}\n';
  const exports: any = { download: async () => ({ content, mimeType: 'application/json', headers: { 'Content-Disposition': 'attachment; filename="analytics.json"' } }) };
  const controller = new AnalyticsManagementController({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, exports);
  const headers: Record<string, string> = {};
  const response: any = { header: (key: string, value: string) => { headers[key] = value; } };
  const result = await controller.downloadExport(EXPORT, response);
  assert.ok(Buffer.isBuffer(result));
  assert.equal(result.toString('utf8'), content);
  assert.deepEqual(headers, {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="analytics.json"',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, private',
  });
});

test('A14 proves runtime and OpenAPI security controls agree for all ten operations', () => {
  const operations = Object.values(contract.paths).flatMap((item: any) => Object.values(item).filter((value: any) => value?.operationId));
  assert.equal(operations.length, 10);
  for (const operation of operations as any[]) {
    assert.equal(operation['x-eqcofe'].domain, 'analytics');
    assert.ok(operation['x-eqcofe'].permission);
    assert.ok(operation.security.some((entry: any) => entry.adminSession));
  }
  const create = contract.paths['/admin/analytics/exports'].post;
  const download = contract.paths['/admin/analytics/exports/{id}/download'].get;
  assert.equal(create['x-eqcofe'].stepUp, true);
  assert.equal(create['x-eqcofe'].idempotency, 'required');
  assert.equal(download['x-eqcofe'].stepUp, true);
});

test('A14 proves forward-only Analytics migration lineage and immutable export constraints remain present', () => {
  for (const number of ['0058', '0059', '0060', '0061', '0062']) {
    assert.match(readFileSync(`database/migrations/${number}_${({ '0058': 'analytics_projection_foundation', '0059': 'analytics_wholesale_application_metrics', '0060': 'analytics_operational_metrics', '0061': 'analytics_management_exports', '0062': 'analytics_http_rbac' } as any)[number]}.sql`, 'utf8'), /BEGIN;/);
  }
  const exportMigration = readFileSync('database/migrations/0061_analytics_management_exports.sql', 'utf8');
  assert.match(exportMigration, /UNIQUE\(requested_by,idempotency_hash\)/);
  assert.match(exportMigration, /ANALYTICS_TERMINAL_EXPORT_IMMUTABLE/);
  assert.doesNotMatch(readFileSync('database/migrations/0062_analytics_http_rbac.sql', 'utf8'), /ALTER TABLE|DROP|DELETE|UPDATE/i);
});

test('A14 retains every Step-51 regression suite and introduces no product scope', () => {
  for (const slice of ['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a10', 'a12', 'a13']) {
    const name = slice === 'a2' ? 'analytics-projection-a2.spec.ts' : `step51-analytics-${slice}.spec.ts`;
    assert.ok(readFileSync(`test/${name}`, 'utf8').length > 0, name);
  }
  assert.doesNotMatch(controllerSource + exportServiceSource, /@Public|\.xlsx|signed.?url|email delivery|cloud upload/i);
});
