import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from 'yaml';

const controller = readFileSync('src/modules/analytics/presentation/analytics-management.controller.ts', 'utf8');
const moduleSource = readFileSync('src/modules/analytics/analytics.module.ts', 'utf8');
const migration = readFileSync('database/migrations/0062_analytics_http_rbac.sql', 'utf8');
const contract = parse(readFileSync('contracts/http/openapi-step51-a13.yaml', 'utf8'));

test('A13 registers a Staff-only Analytics controller', () => {
  assert.match(controller, /@Controller\('admin\/analytics'\)\s*@StaffOnly\(\)/);
  assert.match(moduleSource, /controllers: \[AnalyticsManagementController\]/);
});

test('A13 exposes only the six frozen bounded management reads', () => {
  for (const route of ['sales-revenue', 'profit', 'inventory', 'customers', 'wholesale-applications', 'operations']) {
    assert.ok(controller.includes(`@Get('${route}')`), route);
  }
  assert.equal((controller.match(/@Permissions\('analytics\.view'\)/g) ?? []).length, 6);
});

test('A13 adds one additive read permission without changing export permissions', () => {
  assert.match(migration, /'analytics\.view'/);
  assert.doesNotMatch(migration, /analytics\.export\./);
  assert.match(migration, /ON CONFLICT\(key\) DO NOTHING/);
});

test('export create is separately permitted, stepped-up and idempotent', () => {
  assert.match(controller, /@Permissions\('analytics\.export\.create'\)\s*@RequireStepUp\(\)\s*@RequireIdempotency\('analytics\.export\.create'\)\s*@Post\('exports'\)/);
  assert.match(controller, /@Headers\('idempotency-key'\)/);
});

test('export metadata is actor-bound in the service and separately view-permitted', () => {
  assert.equal((controller.match(/@Permissions\('analytics\.export\.view'\)/g) ?? []).length, 2);
  const repository = readFileSync('src/modules/analytics/infrastructure/management-export.repository.ts', 'utf8');
  assert.match(repository, /requested_by=\$\{actorId\}::uuid/);
});

test('download requires its own permission and Step-Up and allow-lists protective headers', () => {
  assert.match(controller, /@Permissions\('analytics\.export\.download'\)\s*@RequireStepUp\(\)\s*@Get\('exports\/:id\/download'\)/);
  assert.match(controller, /response\.header\('X-Content-Type-Options', 'nosniff'\)/);
  assert.match(controller, /response\.header\('Cache-Control', 'no-store, private'\)/);
  assert.match(controller, /Buffer\.from\(artifact\.content, 'utf8'\)/);
  assert.doesNotMatch(controller, /Object\.entries\(artifact\.headers/);
});

test('OpenAPI exactly covers controller operations and frozen security metadata', () => {
  assert.equal(Object.keys(contract.paths).length, 9);
  const operations = Object.values(contract.paths).flatMap((item: any) => Object.entries(item).filter(([method]) => ['get', 'post'].includes(method)).map(([, operation]) => operation));
  assert.equal(operations.length, 10);
  for (const operation of operations as any[]) assert.equal(operation['x-eqcofe'].domain, 'analytics');
  const create = contract.paths['/admin/analytics/exports'].post;
  assert.deepEqual(create.security, [{ adminSession: [], stepUpToken: [] }]);
  assert.equal(create['x-eqcofe'].idempotency, 'required');
  const download = contract.paths['/admin/analytics/exports/{id}/download'].get;
  assert.equal(download.responses['200'].headers['X-Content-Type-Options'].schema.const, 'nosniff');
  assert.equal(download.responses['200'].headers['Cache-Control'].schema.const, 'no-store, private');
});

test('A13 introduces no projection, business mutation, public delivery or XLSX surface', () => {
  assert.doesNotMatch(controller, /@Public|\.xlsx|signed|email|upload/i);
  assert.doesNotMatch(migration, /CREATE TABLE|ALTER TABLE|CREATE VIEW/);
});
