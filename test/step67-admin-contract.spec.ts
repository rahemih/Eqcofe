import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const api=()=>readFileSync('contracts/http/openapi.yaml','utf8');
const generated=()=>readFileSync('src/generated/openapi.ts','utf8');
const auth=()=>readFileSync('src/modules/identity/presentation/auth.controller.ts','utf8');

test('Step 67-B types runtime-accurate enveloped Admin authentication and context responses',()=>{
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
    assert.match(types.slice(i,i+3200),/"application\/json": components\["schemas"\]/,'untyped '+op);
  }
  for(const op of ['postAdminAuthLogin','postAdminAuthFidoChallenge','postAdminAuthFidoVerify','postAdminAuthStepUpChallenge','postAdminAuthStepUpVerify','postAdminAuthLogout']) {
    const i=types.indexOf(op+':');
    const part=types.slice(i,i+3200);
    assert.match(part,/201:/,'runtime status not documented '+op);
  }
});

test('Step 67-B Admin success schemas model the global success envelope',()=>{
  const source=api();
  for(const schema of ['AdminLoginResponse','AdminFidoChallengeResponse','AdminSessionEstablishedResponse','AdminWebAuthnChallengeResponse','AdminStepUpVerifyResponse','AdminLogoutResponse','AdminSessionResponse','AdminMeResponse','AdminPermissionsResponse','AdminScopesResponse']) {
    const start=source.indexOf('    '+schema+':');
    assert(start>=0,'missing '+schema);
    const part=source.slice(start,start+1100);
    assert.match(part,/required:[\s\S]*- success[\s\S]*- data[\s\S]*- meta/,'not enveloped '+schema);
    assert.match(part,/success:[\s\S]*const: true/,'success const missing '+schema);
    assert.match(part,/meta:[\s\S]*SuccessMeta/,'meta missing '+schema);
  }
});

test('Step 67-B sanitizes Admin session and keeps permissions and scopes on dedicated reads',()=>{
  const controller=auth(),source=api(),types=generated();
  assert.match(controller,/@StaffOnly\(\) @Get\('admin\/auth\/session'\) adminSession\(@Req\(\) req:any\)\{return \{actor:\{type:'staff',id:req\.actor\.id,accountId:req\.actor\.accountId\}\};\}/);
  const actorYaml=source.slice(source.indexOf('    AdminSessionActor:'),source.indexOf('    AdminSessionData:'));
  assert.doesNotMatch(actorYaml,/sessionId|permissions|scopes/);
  const actorTs=types.slice(types.indexOf('AdminSessionActor:'),types.indexOf('AdminSessionData:'));
  assert.doesNotMatch(actorTs,/sessionId|permissions|scopes/);
  assert.match(source,/AdminPermissionsData:[\s\S]*permissions:/);
  assert.match(source,/AdminScopesData:[\s\S]*scopes:/);
});

test('Step 67-B preserves cookie-only pre-auth and Admin session token authority',()=>{
  const source=api(),controller=auth();
  const schemas=source.slice(source.indexOf('    AdminLoginData:'),source.indexOf('    PostAdminAuthLoginRequest:'));
  assert.doesNotMatch(schemas,/pre_auth_token|session_token/);
  assert.match(schemas,/AdminStepUpVerifyData:[\s\S]*step_up_token:/);
  assert.match(controller,/cookieSet\(res,this\.cookieName\('preauth'\),r\.pre_auth_token/);
  assert.match(controller,/cookieSet\(res,this\.cookieName\('admin'\),s\.session_token/);
  assert.match(controller,/typ:'step_up'[\s\S]*sid:req\.actor\.sessionId[\s\S]*5\*60\*1000/);
});

test('Step 67-B leaves WebAuthn options extensible at the stable wrapper boundary',()=>{
  const source=api();
  const options=source.slice(source.indexOf('    AdminWebAuthnOptions:'),source.indexOf('    AdminFidoChallengeData:'));
  assert.match(options,/type: object/);
  assert.match(options,/additionalProperties: true/);
});

test('Step 67-B retains dashboard only as unavailable contract inventory',()=>{
  const source=api(),types=generated();
  assert.match(source,/^  \/admin\/dashboard:/m);
  const start=source.indexOf('  /admin/dashboard:');
  const inventory=source.slice(start,start+900);
  assert.match(inventory,/runtime: unresolved_not_granted/);
  assert.match(inventory,/frontendConsumption: forbidden/);
  assert.doesNotMatch(inventory,/schema:/);
  assert.match(types,/"\\/admin\\/dashboard":/);
  assert.match(types,/getAdminDashboard:/);
  assert.doesNotMatch(auth(),/@Get\('admin\/dashboard'\)/);
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
