import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WholesaleManagementService } from '../src/modules/analytics/application/wholesale-management.service';

function serviceWith(rows: any[]) {
  return new WholesaleManagementService({ wholesaleApplicationMetrics: async () => rows } as any);
}

const submitted = { application_id:'a1', customer_id:'c1', status:'submitted', submitted_at:'2026-08-20T10:00:00.000Z', review_started_at:null, reviewed_at:null, source_watermark:'2026-08-20T10:00:01.000Z' };
const approved = { application_id:'a2', customer_id:'c2', status:'approved', submitted_at:'2026-08-20T10:00:00.000Z', review_started_at:'2026-08-20T11:00:00.000Z', reviewed_at:'2026-08-20T12:00:00.000Z', source_watermark:'2026-08-20T12:00:01.000Z' };
const rejected = { application_id:'a3', customer_id:'c3', status:'rejected', submitted_at:'2026-08-21T10:00:00.000Z', review_started_at:'2026-08-21T11:00:00.000Z', reviewed_at:'2026-08-21T14:00:00.000Z', source_watermark:'2026-08-21T14:00:01.000Z' };

test('Step 51 A8 aggregates bounded wholesale lifecycle management metrics', async () => {
  const out = await serviceWith([submitted, approved, rejected]).read(100);
  assert.equal(out.applicationCount,3);
  assert.equal(out.submittedCount,1);
  assert.equal(out.underReviewCount,0);
  assert.equal(out.approvedCount,1);
  assert.equal(out.rejectedCount,1);
  assert.equal(out.decidedCount,2);
  assert.equal(out.approvalRateBps,5000);
  assert.equal(out.averageDecisionSeconds,10800);
  assert.equal(out.sourceWatermark?.toISOString(),'2026-08-21T14:00:01.000Z');
});

test('Step 51 A8 accepts empty projections without fabricating wholesale activity', async () => {
  const out = await serviceWith([]).read();
  assert.deepEqual({ count:out.applicationCount, decided:out.decidedCount, rate:out.approvalRateBps, seconds:out.averageDecisionSeconds }, { count:0, decided:0, rate:0, seconds:0 });
  assert.equal(out.sourceWatermark,null);
});

test('Step 51 A8 validates bounded result limits', async () => {
  const svc = serviceWith([]);
  await assert.rejects(()=>svc.read(0),/ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(()=>svc.read(501),/ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(()=>svc.read('x'),/ANALYTICS_LIMIT_INVALID/);
});

test('Step 51 A8 rejects invalid wholesale states and temporal evidence', async () => {
  await assert.rejects(()=>serviceWith([{...submitted,status:'unknown'}]).read(),/ANALYTICS_WHOLESALE_STATUS_INVALID/);
  await assert.rejects(()=>serviceWith([{...submitted,status:'approved'}]).read(),/ANALYTICS_WHOLESALE_STATE_INVALID/);
  await assert.rejects(()=>serviceWith([{...approved,reviewed_at:'2026-08-20T09:00:00.000Z'}]).read(),/ANALYTICS_WHOLESALE_TIMELINE_INVALID/);
  await assert.rejects(()=>serviceWith([{...submitted,source_watermark:'bad'}]).read(),/ANALYTICS_SOURCE_WATERMARK_INVALID/);
});

test('Step 51 A8 re-reads Customer authority and watermark-guards the Analytics projection', () => {
  const source=readFileSync('src/modules/analytics/infrastructure/analytics-authoritative-source.reader.ts','utf8');
  const consumer=readFileSync('src/modules/analytics/application/analytics-cross-domain.consumer.ts','utf8');
  const repository=readFileSync('src/modules/analytics/infrastructure/analytics-projection.repository.ts','utf8');
  assert.match(source,/FROM customer\.wholesale_applications/);
  for (const event of ['submitted','review_started','approved','rejected']) assert.ok(consumer.includes(`customer.wholesale_application.${event}.v1`));
  assert.match(consumer,/source\.wholesaleApplication\(trx, applicationId, watermark\)/);
  assert.match(repository,/wholesale_application_metrics\.source_watermark <= EXCLUDED\.source_watermark/);
  assert.doesNotMatch(source,/\b(INSERT|UPDATE|DELETE)\b/i);
});

test('Step 51 A8 is additive read-side only with no HTTP RBAC or Customer mutation authority', () => {
  const migration=readFileSync('database/migrations/0059_analytics_wholesale_application_metrics.sql','utf8');
  const service=readFileSync('src/modules/analytics/application/wholesale-management.service.ts','utf8');
  const moduleSource=readFileSync('src/modules/analytics/analytics.module.ts','utf8');
  assert.match(migration,/CREATE TABLE analytics\.wholesale_application_metrics/);
  assert.doesNotMatch(migration,/ALTER TABLE customer\.|INSERT INTO customer\.|UPDATE customer\.|DELETE FROM customer\./i);
  assert.match(service,/repository\.wholesaleApplicationMetrics\(parseLimit\(limitInput\)\)/);
  assert.doesNotMatch(service,/\b(INSERT|UPDATE|DELETE)\b/i);
  assert.doesNotMatch(service,/@Controller|@Permissions|@StaffOnly/);
  assert.match(moduleSource,/WholesaleManagementService/);
});
