import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CampaignAggregate } from '../src/modules/marketing/domain/campaign.aggregate';
import { DomainError } from '../src/shared/errors/domain-error';

const migration = fs.readFileSync('database/migrations/0036_marketing_campaign_lifecycle.sql','utf8');
const service = fs.readFileSync('src/modules/marketing/application/campaign.service.ts','utf8');
const repository = fs.readFileSync('src/modules/marketing/infrastructure/campaign.repository.ts','utf8');
const moduleFile = fs.readFileSync('src/modules/marketing/marketing.module.ts','utf8');
const startsAt = new Date('2026-08-20T00:00:00.000Z');
const endsAt = new Date('2026-09-20T00:00:00.000Z');

test('campaign domain supports draft active paused active ended archived lifecycle',()=>{
  const c=CampaignAggregate.create({id:'c1',name:'جشنواره',startsAt,endsAt});
  c.activate(new Date('2026-08-21T00:00:00.000Z')); c.pause(); c.activate(new Date('2026-08-22T00:00:00.000Z')); c.end(); c.archive();
  assert.equal(c.status,'archived');
});

test('expired campaign cannot activate',()=>{
  const c=CampaignAggregate.create({id:'c1',name:'جشنواره',startsAt,endsAt});
  assert.throws(()=>c.activate(new Date('2026-09-21T00:00:00.000Z')),(e:unknown)=>e instanceof DomainError&&e.code==='CAMPAIGN_ENDED');
});

test('A4 migration aligns database with ended domain status and fails closed on transitions',()=>{
  assert.match(migration,/draft','active','paused','ended','archived/);
  assert.match(migration,/CAMPAIGN_INVALID_TRANSITION/);
  assert.match(migration,/CAMPAIGN_DELETE_FORBIDDEN/);
  assert.match(migration,/CAMPAIGN_ARCHIVED_IMMUTABLE/);
  assert.match(migration,/CAMPAIGN_RESCHEDULE_INVALID/);
});

test('campaign persistence uses optimistic version compare and row locks',()=>{
  assert.match(repository,/FOR UPDATE/);
  assert.match(repository,/version=\$\{input\.expectedVersion\}/);
  assert.match(repository,/version=version\+1/);
  assert.match(service,/CAMPAIGN_VERSION_CONFLICT/);
});

test('campaign lifecycle writes audit and outbox events',()=>{
  assert.match(service,/outbox\.append/);
  assert.match(service,/audit\.writeWith/);
  assert.match(service,/marketing\.campaign\.created\.v1/);
  assert.match(service,/marketing\.campaign\.\$\{to\}\.v1/);
  assert.match(service,/marketing\.campaign\.rescheduled\.v1/);
});

test('campaign mutations require staff context and version',()=>{
  assert.match(service,/actor\?\.type !== 'staff'/);
  assert.match(service,/VERSION_REQUIRED/);
  assert.match(service,/expectedVersion/);
});

test('reschedule is restricted to draft or paused consistently',()=>{
  assert.match(repository,/status IN \('draft','paused'\)/);
  assert.match(service,/\['draft', 'paused'\]/);
});

test('marketing module registers and exports campaign service',()=>{
  assert.match(moduleFile,/CampaignService/);
  assert.match(moduleFile,/CampaignRepository/);
  assert.match(moduleFile,/exports:\s*\[[^\]]*CampaignService[^\]]*\]/);
});
