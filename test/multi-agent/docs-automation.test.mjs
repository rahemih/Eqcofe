import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  catalogEntryFromTask, checkTaskCatalog, renderTaskCatalog, writeTaskCatalog,
} from '../../scripts/multi-agent/docs-automation.mjs';

function contract(id,{risk='LOW',human=false,budget={expected_max:10,soft_alert:20,hard_cap:30}}={}){
  return {task_id:id,title:`Title ${id}`,risk,human_gate_required:human,canonical:{base_sha:'a'.repeat(40)},...(budget?{token_budget:budget}:{})};
}

test('catalog entry validates risk, human gate and canonical base while allowing legacy no-budget contracts',()=>{
  const entry=catalogEntryFromTask(contract('A',{budget:null}),'A.json');
  assert.equal(entry.token_budget,null);
  assert.throws(()=>catalogEntryFromTask({...contract('B'),risk:'CRITICAL'},'B.json'),/INVALID_TASK_RISK/);
  assert.throws(()=>catalogEntryFromTask({...contract('B'),human_gate_required:'no'},'B.json'),/HUMAN_GATE_REQUIRED/);
  assert.throws(()=>catalogEntryFromTask({...contract('B'),canonical:{base_sha:'abc'}},'B.json'),/INVALID_CANONICAL_BASE/);
});

test('catalog rendering is stable and sorted by task id',()=>{
  const b=catalogEntryFromTask(contract('B',{risk:'HIGH',human:true}),'B.json');
  const a=catalogEntryFromTask(contract('A',{budget:null}),'A.json');
  const out=renderTaskCatalog([b,a]);
  assert.ok(out.indexOf('| A |') < out.indexOf('| B |'));
  assert.match(out,/N\/A \(legacy\/no budget\)/);
  assert.match(out,/REQUIRED/);
});

test('generator owns only isolated generated catalog and check mode detects stale bytes',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'eqcofe-docs-'));
  const tasks=path.join(root,'docs/14-multi-agent/tasks');
  await mkdir(tasks,{recursive:true});
  await writeFile(path.join(tasks,'B.json'),JSON.stringify(contract('B')));
  await writeFile(path.join(tasks,'A.json'),JSON.stringify(contract('A',{budget:null})));
  const expected=await writeTaskCatalog(root);
  assert.equal(await checkTaskCatalog(root),true);
  const generated=path.join(root,'docs/14-multi-agent/generated/TASK-CATALOG.md');
  assert.equal(await readFile(generated,'utf8'),expected);
  await writeFile(generated,`${expected}\nmanual drift`);
  await assert.rejects(()=>checkTaskCatalog(root),/TASK_CATALOG_STALE/);
});

test('duplicate task ids fail closed',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'eqcofe-docs-'));
  const tasks=path.join(root,'docs/14-multi-agent/tasks');
  await mkdir(tasks,{recursive:true});
  await writeFile(path.join(tasks,'A.json'),JSON.stringify(contract('DUP')));
  await writeFile(path.join(tasks,'B.json'),JSON.stringify(contract('DUP')));
  await assert.rejects(()=>writeTaskCatalog(root),/DUPLICATE_TASK_ID:DUP/);
});

test('canonical repository generated catalog is exact and therefore future task changes create drift',async()=>{
  const root=process.cwd();
  const expectedPath=path.join(root,'docs/14-multi-agent/generated/TASK-CATALOG.md');
  try { await readFile(expectedPath,'utf8'); } catch { return test.skip('repository catalog not present in isolated fixture'); }
  assert.equal(await checkTaskCatalog(root),true);
});
