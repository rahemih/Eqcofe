import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=resolve("apps/admin");
const read=(path:string)=>readFileSync(resolve(root,path),"utf8");

const routes=read("app/routes.ts");
const rootRoute=read("app/root.tsx");
const login=read("app/routes/login.tsx");
const authenticated=read("app/routes/authenticated.tsx");
const logout=read("app/routes/logout.ts");
const shell=read("app/shell/AdminShell.tsx");
const flow=read("app/platform/auth/admin-auth-flow.server.ts");
const session=read("app/platform/auth/session.server.ts");
const context=read("app/platform/auth/context.server.ts");
const webauthn=read("app/platform/auth/webauthn.client.ts");
const cookie=read("app/platform/auth/admin-cookie.server.ts");
const css=read("app/styles/auth.css");
const task=read("../../docs/14-multi-agent/tasks/EQCOFE-STEP67-D-ADMIN-AUTH-SESSION-001.json");

assert.match(routes,/route\("login"/);
assert.match(routes,/route\("logout"/);
assert.match(routes,/layout\("\.\/routes\/authenticated\.tsx"/);
assert.doesNotMatch(rootRoute,/AdminShell/);
assert.match(authenticated,/readAdminAuthorizationContext/);
assert.match(authenticated,/kind==="unauthenticated"/);
assert.match(authenticated,/kind==="unavailable"/);
assert.match(authenticated,/AdminShell actor=/);
assert.match(context,/\/admin\/auth\/session/);
assert.match(context,/\/admin\/me\/permissions/);
assert.match(context,/\/admin\/me\/scopes/);
assert.doesNotMatch(context,/localStorage|sessionStorage|pre_auth_token|session_token|\/admin\/dashboard/);

assert.match(login,/beginAdminLogin/);
assert.match(login,/requestAdminFidoChallenge/);
assert.match(login,/verifyAdminFido/);
assert.match(login,/runAdminWebAuthn/);
assert.match(login,/enrollment-required/);
assert.match(login,/webauthnRetry/);
assert.match(login,/تلاش دوباره با کلید امنیتی/);
assert.match(login,/autoComplete="current-password"/);
assert.doesNotMatch(login,/localStorage|sessionStorage|pre_auth_token|session_token/);

assert.match(flow,/\/admin\/auth\/login/);
assert.match(flow,/\/admin\/auth\/fido\/challenge/);
assert.match(flow,/\/admin\/auth\/fido\/verify/);
assert.match(flow,/\/admin\/auth\/logout/);
assert.doesNotMatch(flow,/\/admin\/me\/permissions|\/admin\/me\/scopes|\/admin\/dashboard/);

assert.match(session,/\/admin\/auth\/session/);
assert.match(session,/actor\.type !== "staff"/);
assert.doesNotMatch(session,/permissions|scopes|sessionId/);

assert.match(webauthn,/navigator\.credentials\.create/);
assert.match(webauthn,/navigator\.credentials\.get/);
assert.match(webauthn,/fromBase64Url/);
assert.match(webauthn,/toBase64Url/);
assert.doesNotMatch(webauthn,/localStorage|sessionStorage/);

assert.match(cookie,/httponly/);
assert.match(cookie,/samesite/);
assert.match(cookie,/ADMIN_COOKIE_DOMAIN_FORBIDDEN/);
assert.match(cookie,/headers\.delete\("authorization"\)/);

assert.match(logout,/request\.method!=="POST"/);
assert.match(logout,/isTrustedFormOrigin/);
assert.match(shell,/action="\/logout"/);

assert.match(css,/focus-visible/);
assert.match(css,/min-block-size:var\(--eq-size-touch-min\)/);
assert.doesNotMatch(css,/brown|\bleft\b|\bright\b/i);

const parsed=JSON.parse(task) as {risk:string;human_gate_required:boolean;canonical:{base_sha:string};scope:{forbidden:string[]}};
assert.equal(parsed.risk,"HIGH");
assert.equal(parsed.human_gate_required,true);
assert.equal(parsed.canonical.base_sha,"3b72b7972edcad99531e37503cb359021d1f4b5e");
assert.ok(parsed.scope.forbidden.includes("contracts/**"));
assert.ok(parsed.scope.forbidden.includes("src/**"));
assert.ok(parsed.scope.forbidden.includes("apps/storefront/**"));

console.log(JSON.stringify({
  status:"PASS",
  stage:"67-D",
  serverOnlyLogin:true,
  cookieOnlySessionAuthority:true,
  webauthnBrowserBoundary:true,
  protectedSessionProbe:true,
  logoutServerMutation:true,
  authorizationContextRegression:true,
  dashboardDeferred:true,
  humanGateRequired:true
},null,2));
