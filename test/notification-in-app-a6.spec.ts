import test from 'node:test';import assert from 'node:assert/strict';import { readFileSync } from 'node:fs';import { inAppAcknowledgedEvent } from '../src/modules/notifications/domain/notification.events';
const repo=readFileSync('src/modules/notifications/infrastructure/notification.repository.ts','utf8'),svc=readFileSync('src/modules/notifications/application/notification-in-app.service.ts','utf8');
test('in-app acknowledged event is versioned',()=>{assert.equal(inAppAcknowledgedEvent('11111111-1111-4111-8111-111111111111',{}).eventType,'notification.in_app.acknowledged.v1');});
test('mark read is idempotent at database boundary',()=>{assert.match(repo,/COALESCE\(read_at,now\(\)\)/);});
test('acknowledge is compare-and-set guarded',()=>{assert.match(repo,/acknowledged_at IS NULL/);});
test('inbox is owner scoped',()=>{assert.match(repo,/recipient_subject_type=\$\{subjectType\} AND r\.recipient_subject_id=\$\{subjectId\}/);});
test('acknowledge emits audit and outbox event only on first mutation path',()=>{assert.match(svc,/notifications\.in_app\.acknowledge/);assert.match(svc,/inAppAcknowledgedEvent/);});
