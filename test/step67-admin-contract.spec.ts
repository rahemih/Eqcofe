import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const api=()=>readFileSync('contracts/http/openapi.yaml','utf8');
const generated=()=>readFileSync('src/generated/openapi.ts','utf8');
const auth=()=>readFileSync('src/modules/identity/presentation/auth.controller.ts','utf8');

test('Step 67-B types existing Admin authentication and context responses',()=>{
  const source=api(),types=generated();
  for(const schema of [
    'AdminLoginResponse','AdminFidoChallengeResponse','AdminSessionEstablishedResponse',
    'AdminWebAuthnChallengeResponse','AdminStepUpVerifyResponse','AdminLogoutResponse',
    'AdminSessionResponse','AdminMeResponse','AdminPermissionsResponse','AdminScopesResponse'
  ]) assert.match(source,new RegExp('    '+schema+':'));
  for(const op of [
    'postAdminAuthLogin','postAdminAuthFidoChallenge','postAdminAuthFidoVerify',
    'postAdminAuthStepUpChallenge','postAdminAuthStepUpVerify','postAdminAuthLogout',
    'getAdminAuthSession','getAdminMe','getAdminMePermissions','getAdminMeScopes'
  ]) {
    const i=types.indexOf(op+':');
    assert.notEqual(i,-1,'missing '+op);
    assert.match(types.slice(i,i+2800),/"application\/json": components\["schemas"\]/,'untyped '+op);
  }
});

test('Step 67-B schemas match existing controller authority and do not expose session tokens',()=>{
  const source=api(),controller=auth();
  assert.match(controller,/return \{fido_required:true,expires_in_seconds:r\.expires_in_seconds\}/);
  assert.match(controller,/return \{session_id:s\.session_id,expires_at:s\.expires_at\}/);
  assert.match(controller,/return \{step_up_token:this\.tokens\.sign/);
  assert.match(controller,/return \{id:req\.actor\.id,account_id:req\.actor\.accountId,type:req\.actor\.type\}/);
  assert.match(controller,/return \{permissions:req\.actor\.permissions\?\?\[\]\}/);
  assert.match(controller,/return \{scopes:req\.actor\.scopes\?\?\[\]\}/);
  assert.match(controller,/return \{actor:req\.actor\}/);
  assert.match(controller,/HttpOnly; .*SameSite=\$\{sameSite\}/);
  const sessionSchema=source.slice(source.indexOf('    AdminSessionActor:'),source.indexOf('    AdminSessionResponse:'));
  assert.doesNotMatch(sessionSchema,/session_token|pre_auth_token|step_up_token/);
});

test('Step 67-B removes non-runtime dashboard operation from executable HTTP authority',()=>{
  const source=api(),types=generated();
  assert.doesNotMatch(source,/^  \/admin\/dashboard:/m);
  assert.doesNotMatch(types,/"\/admin\/dashboard":/);
  assert.doesNotMatch(types,/getAdminDashboard:/);
  const design=readFileSync('docs/13-product-design/step56-foundation/A/SOURCE-GAPS.md','utf8');
  assert.match(design,/GET \/admin\/dashboard[^\n]*UNRESOLVED_NOT_GRANTED/);
});

test('Step 67-B generated OpenAPI is byte-for-byte reproducible from canonical source',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step67-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    assert.equal(readFileSync('src/generated/openapi.ts','utf8'),readFileSync(output,'utf8'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
