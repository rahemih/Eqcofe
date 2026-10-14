import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=resolve("apps/admin");
const read=(path:string)=>readFileSync(resolve(root,path),"utf8");

const routes=read("app/routes.ts");
const route=read("app/routes/security-keys.tsx");
const bridge=read("app/platform/auth/admin-cookie.server.ts");
const lifecycle=read("app/platform/auth/step-up-credentials.server.ts");
const webauthn=read("app/platform/auth/webauthn.client.ts");
const dialog=read("app/security/ActionReviewDialog.tsx");
const shell=read("app/shell/AdminShell.tsx");
const packageJson=JSON.parse(read("package.json")) as {scripts:Record<string,string>};
const task=JSON.parse(read("../../docs/14-multi-agent/tasks/EQCOFE-STEP67-F-STEPUP-CREDENTIALS-001.json")) as {
  risk:string;human_gate_required:boolean;canonical:{base_sha:string};scope:{forbidden:string[]}
};

assert.match(routes,/route\("security-keys"/);
assert.match(shell,/to="\/security-keys"/);
assert.match(shell,/>67-F</);

for(const endpoint of [
  "/admin/auth/fido/credentials",
  "/admin/auth/step-up/challenge",
  "/admin/auth/step-up/verify",
  "/admin/auth/fido/credentials/register/challenge",
  "/admin/auth/fido/credentials/register/verify",
  "/admin/auth/fido/credentials/{id}/revoke"
]) assert.ok(lifecycle.includes(endpoint),"STEP67_F_ENDPOINT_MISSING:"+endpoint);

assert.match(bridge,/headers\.delete\("x-step-up-token"\)/);
assert.match(bridge,/headers\.set\("X-Step-Up-Token",stepUpToken\)/);
assert.match(bridge,/normalizeStepUpToken/);
assert.doesNotMatch(bridge,/localStorage|sessionStorage|document\.cookie/);

assert.match(route,/begin-add/);
assert.match(route,/begin-revoke/);
assert.match(route,/verify-step-up/);
assert.match(route,/verify-registration/);
assert.match(route,/ActionReviewDialog/);
assert.match(route,/runAdminWebAuthn\("authentication"/);
assert.match(route,/runAdminWebAuthn\("registration"/);
assert.match(route,/stepUpTokenRef/);
assert.match(route,/\.set\("intent","discard"\)/);
assert.doesNotMatch(route,/localStorage|sessionStorage|document\.cookie/);
assert.doesNotMatch(route,/dangerouslySetInnerHTML/);

const revokeVerify=route.indexOf('if(actionKind==="revoke")');
const revokeCall=route.indexOf("revokeAdminFidoCredential",revokeVerify);
assert.ok(revokeVerify>=0&&revokeCall>revokeVerify,"REVOKE_MUST_FOLLOW_STEP_UP_VERIFY");
assert.match(route,/current\.credentials\.some\(item=>item\.id===credentialId\)/);
assert.match(route,/آخرین کلید امنیتی فعال قابل لغو نیست/);

assert.match(lifecycle,/LAST_FIDO2_CREDENTIAL_CANNOT_BE_REVOKED/);
assert.match(lifecycle,/STEP_UP_REQUIRED/);
assert.match(lifecycle,/credentials\.length>32/);
const summary=lifecycle.slice(lifecycle.indexOf("function isCredentialSummary"),lifecycle.indexOf("function isDateTime"));
for(const secret of ["credential_id","public_key","sign_count","webauthn_user_id"]) assert.doesNotMatch(summary,new RegExp(secret),"SUMMARY_SECRET_FIELD_FORBIDDEN:"+secret);

assert.match(webauthn,/navigator\.credentials\.create/);
assert.match(webauthn,/navigator\.credentials\.get/);
assert.doesNotMatch(webauthn,/localStorage|sessionStorage/);

assert.match(dialog,/showModal\(\)/);
assert.match(dialog,/cancelRef\.current\?\.focus/);
assert.match(dialog,/onCancel/);
assert.match(dialog,/aria-labelledby="admin-review-title"/);
assert.match(dialog,/aria-describedby="admin-review-description"/);
assert.match(dialog,/انصراف/);

assert.match(packageJson.scripts.verify??"",/stepup-credentials:verify/);
assert.equal(task.risk,"HIGH");
assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"6ec157ea5799d7c06cde5599a5bb3b828d767a1e");
assert.ok(task.scope.forbidden.includes("database/**"));
assert.ok(task.scope.forbidden.includes("src/modules/identity/application/**"));
assert.ok(task.scope.forbidden.includes("docs/13-product-design/**"));

const combined=[route,lifecycle,bridge,dialog,shell].join("\n");
assert.doesNotMatch(combined,/\/admin\/dashboard/);
assert.doesNotMatch(combined,/\/admin\/(?:products|orders|inventory|customers|finance|pricing)\b/);

console.log(JSON.stringify({
  status:"PASS",
  stage:"67-F",
  contractReconciled:true,
  stepUpServerBoundary:true,
  transientStepUpCapability:true,
  credentialSelfService:true,
  explicitActionReview:true,
  lastCredentialFailClosed:true,
  dashboardDeferred:true,
  domainMutationsDeferred:true,
  humanGateRequired:true
},null,2));
