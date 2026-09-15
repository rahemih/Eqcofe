import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {
  changedPathsForCommit, parseNameStatus, taskContractPathFromPullRequestBody,
  validateCommitHistory, validateExplicitPaths,
} from '../../scripts/multi-agent/scope-validation.mjs';
const execFile=promisify(execFileCb);
const task={task_id:'TASK',scope:{write:['allowed/**','rename-ok.txt'],forbidden:['allowed/secret/**']}};
async function git(cwd,...args){const {stdout}=await execFile('git',args,{cwd,encoding:'utf8'});return stdout.trim();}
async function repo(){const cwd=await mkdtemp(path.join(os.tmpdir(),'scope-git-')); await git(cwd,'init'); await git(cwd,'config','user.email','test@example.com'); await git(cwd,'config','user.name','Test'); return cwd;}

test('explicit pre-change validation reuses forbidden-precedence scope semantics',()=>{
  assert.deepEqual(validateExplicitPaths(task,['allowed/a.txt']),['allowed/a.txt']);
  assert.throws(()=>validateExplicitPaths(task,['other/a.txt']),/OUT_OF_SCOPE:other\/a.txt/);
  assert.throws(()=>validateExplicitPaths(task,['allowed/secret/a.txt']),/FORBIDDEN_SCOPE:allowed\/secret\/a.txt/);
});

test('name-status parser includes both sides of rename and copy operations',()=>{
  assert.deepEqual(parseNameStatus('R100\tallowed/a.txt\tother/a.txt\nM\tallowed/b.txt'),['allowed/a.txt','allowed/b.txt','other/a.txt']);
});

test('pull request body must contain exactly one constrained Task Contract reference',()=>{
  assert.equal(taskContractPathFromPullRequestBody('Task Contract: `docs/14-multi-agent/tasks/TASK-1.json`'),'docs/14-multi-agent/tasks/TASK-1.json');
  assert.throws(()=>taskContractPathFromPullRequestBody('none'),/PR_TASK_CONTRACT_REFERENCE_REQUIRED/);
  assert.throws(()=>taskContractPathFromPullRequestBody('Task Contract: `README.md`'),/INVALID_TASK_CONTRACT_PATH/);
});

test('clean in-scope git history passes with per-commit evidence',async()=>{
  const cwd=await repo(); await mkdir(path.join(cwd,'allowed')); await writeFile(path.join(cwd,'allowed/a.txt'),'base'); await git(cwd,'add','.'); await git(cwd,'commit','-m','base'); const base=await git(cwd,'rev-parse','HEAD');
  await writeFile(path.join(cwd,'allowed/a.txt'),'next'); await git(cwd,'add','.'); await git(cwd,'commit','-m','ok'); const head=await git(cwd,'rev-parse','HEAD');
  const evidence=await validateCommitHistory({task,base_sha:base,head_sha:head,cwd}); assert.equal(evidence.length,1); assert.deepEqual(evidence[0].changed_paths,['allowed/a.txt']);
});

test('rename crossing write scope exposes old and new path and fails closed',async()=>{
  const cwd=await repo(); await mkdir(path.join(cwd,'allowed')); await writeFile(path.join(cwd,'allowed/a.txt'),'base'); await git(cwd,'add','.'); await git(cwd,'commit','-m','base'); const base=await git(cwd,'rev-parse','HEAD');
  await git(cwd,'mv','allowed/a.txt','outside.txt'); await git(cwd,'commit','-m','rename','-a'); const head=await git(cwd,'rev-parse','HEAD');
  const paths=await changedPathsForCommit(head,cwd); assert.deepEqual(paths,['allowed/a.txt','outside.txt']);
  await assert.rejects(()=>validateCommitHistory({task,base_sha:base,head_sha:head,cwd}),/OUT_OF_SCOPE:outside.txt/);
});

test('empty branch range is not accepted as scope evidence',async()=>{
  const cwd=await repo(); await writeFile(path.join(cwd,'rename-ok.txt'),'base'); await git(cwd,'add','.'); await git(cwd,'commit','-m','base'); const sha=await git(cwd,'rev-parse','HEAD');
  await assert.rejects(()=>validateCommitHistory({task,base_sha:sha,head_sha:sha,cwd}),/NO_BRANCH_ONLY_COMMITS/);
});

test('unsupported git status fails closed',()=>assert.throws(()=>parseNameStatus('Z\tallowed/a.txt'),/UNSUPPORTED_GIT_STATUS:Z/));
