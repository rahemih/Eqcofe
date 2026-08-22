import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGovernedPromptVersion, normalizePromptKey } from '../src/modules/ai/domain/governed-prompt';

const migration=readFileSync('database/migrations/0045_ai_governed_prompts.sql','utf8');
const service=readFileSync('src/modules/ai/application/governed-prompt.service.ts','utf8');
const repo=readFileSync('src/modules/ai/infrastructure/governed-prompt.repository.ts','utf8');

test('A3 normalizes governed prompt keys and validates immutable version inputs',()=>{
  assert.equal(normalizePromptKey(' Product-QA '),'product-qa');
  const p=createGovernedPromptVersion({promptKey:'product-qa',operation:'product_qa',version:1,template:'Answer only from authoritative product context.'});
  assert.equal(p.version,1);assert.equal(p.operation,'product_qa');
  assert.throws(()=>normalizePromptKey('INVALID KEY!'));
  assert.throws(()=>createGovernedPromptVersion({promptKey:'product-qa',operation:'product_qa',version:0,template:'x'}));
  assert.throws(()=>createGovernedPromptVersion({promptKey:'product-qa',operation:'product_qa',version:1,template:''}));
});

test('A3 migration is forward-only and prompt versions are database immutable',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS ai\.prompt_definitions/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS ai\.prompt_versions/);
  assert.match(migration,/UNIQUE\(prompt_id, version_number\)/);
  assert.match(migration,/AI_PROMPT_VERSION_IMMUTABLE/);
  assert.match(migration,/BEFORE UPDATE OR DELETE ON ai\.prompt_versions/);
  assert.doesNotMatch(migration,/DROP TABLE/i);
});

test('A3 active version must belong to the same prompt and history cannot cascade delete',()=>{
  assert.match(migration,/FOREIGN KEY \(id, active_version\)[\s\S]*REFERENCES ai\.prompt_versions\(prompt_id, version_number\)/);
  assert.match(migration,/REFERENCES ai\.prompt_definitions\(id\) ON DELETE RESTRICT/);
});

test('A3 governance is staff-only and uses optimistic aggregate version control',()=>{
  assert.match(service,/a\?\.type!=='staff'/);
  assert.match(repo,/AND version=\$\{input\.expectedVersion\}/);
  assert.match(service,/VERSION_CONFLICT/);
});

test('A3 resolves only active prompt matching explicit operation',()=>{
  assert.match(repo,/d\.operation=\$\{operation\} AND d\.status='active'/);
  assert.match(service,/AI_PROMPT_ACTIVE_VERSION_NOT_FOUND/);
});

test('A3 does not introduce provider adapters secrets or commerce mutations',()=>{
  const combined=migration+'\n'+service+'\n'+repo;
  assert.doesNotMatch(combined,/api[_-]?key|secret_value|access_token|refresh_token/i);
  assert.doesNotMatch(combined,/pricing\.|inventory\.|orders\.|payments\.|finance\./i);
});
