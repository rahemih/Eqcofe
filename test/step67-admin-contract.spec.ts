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
  const end=source.indexOf('\n  /admin/',start+1);
  const inventory=source.slice(start,end===-1?undefined:end);
  assert.match(inventory,/runtime: unresolved_not_granted/);
  assert.match(inventory,/frontendConsumption: forbidden/);
  assert.doesNotMatch(inventory,/schema:/);
  assert.match(types,/"\/admin\/dashboard":/);
  assert.match(types,/getAdminDashboard:/);
  assert.doesNotMatch(auth(),/@Get\('admin\/dashboard'\)/);
  const design=readFileSync('docs/13-product-design/step56-foundation/A/SOURCE-GAPS.md','utf8');
  assert.match(design,/GET \/admin\/dashboard[^\n]*UNRESOLVED_NOT_GRANTED/);
});
test('Step 67-F credential self-service contract is runtime-accurate and secret-minimized',()=>{
  const source=api(),types=generated(),controller=auth();
  for(const route of [
    "@StaffOnly() @Get('admin/auth/fido/credentials')",
    "@StaffOnly() @Post('admin/auth/fido/credentials/register/challenge')",
    "@StaffOnly() @Post('admin/auth/fido/credentials/register/verify')",
    "@StaffOnly() @Post('admin/auth/fido/credentials/:id/revoke')"
  ]) assert.ok(controller.includes(route),'runtime route missing '+route);

  const summaryStart=source.indexOf('    AdminFidoCredentialSummary:');
  const summaryEnd=source.indexOf('    AdminFidoCredentialsResponse:',summaryStart);
  assert.ok(summaryStart>=0&&summaryEnd>summaryStart,'credential summary schema missing');
  const summary=source.slice(summaryStart,summaryEnd);
  for(const field of ['id','device_name','credential_device_type','backed_up','last_used_at','created_at']) assert.match(summary,new RegExp('\\n        '+field+':'),'missing safe summary field '+field);
  for(const secret of ['credential_id','public_key','sign_count','webauthn_user_id','session_token','enrollment_token','step_up_token']) assert.doesNotMatch(summary,new RegExp(secret),'secret leaked in credential summary '+secret);

  const operations=[
    ['listAdminFidoCredentials',200,'AdminFidoCredentialsResponse'],
    ['createAdditionalAdminFidoCredentialChallenge',201,'AdminWebAuthnChallengeResponse'],
    ['verifyAdditionalAdminFidoCredential',201,'AdminFidoCredentialRegisteredResponse'],
    ['revokeAdminFidoCredential',201,'AdminFidoCredentialRevokedResponse']
  ] as const;
  for(const [op,status,schema] of operations){
    const i=types.indexOf(op+':');
    assert.notEqual(i,-1,'missing generated operation '+op);
    const part=types.slice(i,i+2400);
    assert.match(part,new RegExp('\\n            '+status+':'),'runtime status drift '+op);
    assert.match(part,new RegExp('components\\["schemas"\\]\\["'+schema+'"\\]'),'untyped credential operation '+op);
  }

  const anchor=source.slice(source.indexOf('- &id028'),source.indexOf('- &id028')+120);
  assert.match(anchor,/adminSession: \[\][\s\S]*stepUpToken: \[\]/,'canonical Step-Up security anchor drift');
  for(const path of [
    '/admin/auth/fido/credentials/register/challenge:',
    '/admin/auth/fido/credentials/register/verify:',
    '/admin/auth/fido/credentials/{id}/revoke:'
  ]){
    const start=source.indexOf('  '+path);
    const end=source.indexOf('\n  /',start+3);
    const block=source.slice(start,end===-1?undefined:end);
    assert.match(block,/security:[\s\S]*- \*id028/,'Step-Up security missing '+path);
  }
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
