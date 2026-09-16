import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {
  ensureCommitAvailable, loadTaskContract, pullRequestContextFromEvent, validateCommitHistory,
} from '../../scripts/multi-agent/scope-validation.mjs';
const execFile=promisify(execFileCb);
async function git(cwd,...args){const {stdout}=await execFile('git',args,{cwd,encoding:'utf8'});return stdout.trim();}
async function initRepo(){const cwd=await mkdtemp(path.join(os.tmpdir(),'scope-history-')); await git(cwd,'init'); await git(cwd,'config','user.email','test@example.com'); await git(cwd,'config','user.name','Test'); return cwd;}
const task={task_id:'TASK',scope:{write:['allowed/**'],forbidden:[]}};

test('transient out-of-scope commit remains blocking after a later revert removes it from final diff',async()=>{
  const cwd=await initRepo(); await mkdir(path.join(cwd,'allowed')); await writeFile(path.join(cwd,'allowed/base.txt'),'base'); await git(cwd,'add','.'); await git(cwd,'commit','-m','base'); const base=await git(cwd,'rev-parse','HEAD');
  await writeFile(path.join(cwd,'marker.tmp'),'bad'); await git(cwd,'add','.'); await git(cwd,'commit','-m','bad transient');
  await rm(path.join(cwd,'marker.tmp')); await git(cwd,'add','-A'); await git(cwd,'commit','-m','revert transient'); const head=await git(cwd,'rev-parse','HEAD');
  assert.equal(await git(cwd,'diff','--name-only',base,head),'');
  await assert.rejects(()=>validateCommitHistory({task,base_sha:base,head_sha:head,cwd}),/SCOPE_HISTORY_VIOLATION:.*OUT_OF_SCOPE:marker.tmp/);
});

test('multiple clean in-scope commits pass complete history validation',async()=>{
  const cwd=await initRepo(); await mkdir(path.join(cwd,'allowed')); await writeFile(path.join(cwd,'allowed/base.txt'),'base'); await git(cwd,'add','.'); await git(cwd,'commit','-m','base'); const base=await git(cwd,'rev-parse','HEAD');
  await writeFile(path.join(cwd,'allowed/a.txt'),'a'); await git(cwd,'add','.'); await git(cwd,'commit','-m','a'); await writeFile(path.join(cwd,'allowed/b.txt'),'b'); await git(cwd,'add','.'); await git(cwd,'commit','-m','b'); const head=await git(cwd,'rev-parse','HEAD');
  const evidence=await validateCommitHistory({task,base_sha:base,head_sha:head,cwd}); assert.equal(evidence.length,2);
});

const live = process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_NAME === 'pull_request';
test('live pull_request history is validated against the PR-declared active Task Contract', { skip: !live }, async()=>{
  const context=await pullRequestContextFromEvent();
  await ensureCommitAvailable(context.base_sha);
  await ensureCommitAvailable(context.head_sha);
  const contract=await loadTaskContract(context.task_contract_path);
  const evidence=await validateCommitHistory({task:contract,base_sha:context.base_sha,head_sha:context.head_sha});
  assert.ok(evidence.length>0,'live PR must contain at least one branch-only commit');
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  assert.equal(context.head_sha,event.pull_request.head.sha);
  assert.equal(context.base_sha,event.pull_request.base.sha);
});
