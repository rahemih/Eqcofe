import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ctl=readFileSync('src/modules/content/presentation/content-admin.controller.ts','utf8');
const svc=readFileSync('src/modules/content/application/article-admin-query.service.ts','utf8');
const draft=readFileSync('src/modules/content/application/article-draft.service.ts','utf8');
const editorial=readFileSync('src/modules/content/application/article-editorial.service.ts','utf8');
const api=readFileSync('contracts/http/openapi.yaml','utf8');

test('admin content reads are staff/RBAC guarded',()=>{
  assert.match(ctl,/@Controller\('admin\/content\/articles'\)[\s\S]*@StaffOnly\(\)/);
  assert.ok((ctl.match(/@Permissions\('content\.view'\)/g)||[]).length>=4);
});
test('create edit and submit review require idempotency',()=>{
  for(const scope of ['content.article.create','content.article.edit','content.article.submit_review']) assert.ok(ctl.includes(`@RequireIdempotency('${scope}')`));
  assert.ok(ctl.includes("@Permissions('content.edit')"));
  assert.ok(ctl.includes("@Permissions('content.review')"));
});
test('high-impact editorial mutations require step-up plus idempotency',()=>{
  for(const scope of ['content.article.approve','content.article.schedule','content.article.publish','content.article.unpublish','content.article.archive','content.article.version.restore']) assert.ok(ctl.includes(`@RequireIdempotency('${scope}')`));
  assert.ok((ctl.match(/@RequireStepUp\(\)/g)||[]).length>=6);
});
test('HTTP controller delegates to existing A4/A5 services without bypassing lifecycle',()=>{
  assert.ok(ctl.includes('this.drafts.create(b)'));
  assert.ok(ctl.includes('this.drafts.update(id,b)'));
  assert.ok(ctl.includes('this.editorial.submitReview'));
  assert.ok(ctl.includes('this.editorial.publish(id)'));
  assert.ok(draft.includes("CONTENT_FIELD_FORBIDDEN"));
  assert.ok(editorial.includes("CONTENT_INVALID_STATE"));
});
test('admin query service validates status and version input',()=>{
  assert.ok(svc.includes('CONTENT_STATUS_INVALID'));
  assert.ok(svc.includes('CONTENT_VERSION_INVALID'));
  assert.ok(svc.includes('CONTENT_ARTICLE_NOT_FOUND'));
});
test('OpenAPI A9 contract requires idempotency and step-up on sensitive operations',()=>{
  const section=api.slice(api.indexOf('  /admin/content/articles:'),api.indexOf('  /admin/ai/jobs:'));
  assert.ok((section.match(/#\/components\/parameters\/IdempotencyKey/g)||[]).length>=9);
  assert.ok((section.match(/stepUpToken: \[\]/g)||[]).length>=6);
  const patchSchema=api.slice(api.indexOf('    PatchAdminContentArticlesIdRequest:'),api.indexOf('    PostAdminAiJobsRequest:'));
  assert.ok(!patchSchema.includes('scheduled_at:'));
});
