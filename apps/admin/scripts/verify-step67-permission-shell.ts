import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ADMIN_DESTINATIONS, ADMIN_NAV_GROUPS } from "../app/navigation/destinations.generated.js";
import { findPermittedDestination, getPermittedDestinations, getPermittedGroups } from "../app/navigation/destination-policy.js";

const root=resolve("apps/admin");
const read=(path:string)=>readFileSync(resolve(root,path),"utf8");
const context=read("app/platform/auth/context.server.ts");
const authenticated=read("app/routes/authenticated.tsx");
const destination=read("app/routes/destination.tsx");
const shell=read("app/shell/AdminShell.tsx");
const routes=read("app/routes.ts");
const appText=[context,authenticated,destination,shell,routes,read("app/routes/foundation.tsx")].join("\n");
const generator=read("scripts/generate-step67-destinations.mjs");
const task=JSON.parse(read("../../docs/14-multi-agent/tasks/EQCOFE-STEP67-E-PERMISSION-SCOPE-SHELL-001.json")) as {
  risk:string;human_gate_required:boolean;canonical:{base_sha:string};scope:{forbidden:string[]}
};

assert.equal(ADMIN_DESTINATIONS.length,60);
assert.equal(ADMIN_NAV_GROUPS.length,8);
assert.ok(!new Set(ADMIN_DESTINATIONS.map((item)=>String(item.group))).has("admin-home"));
assert.equal(new Set(ADMIN_DESTINATIONS.map((item)=>item.surface)).size,60);
assert.match(generator,/operation\.blocked===true/);
assert.match(generator,/operation\.gapIds/);
assert.match(generator,/executionAuthority\.startsWith\("NO_ACTION"\)/);
assert.match(generator,/permissionClaims\?\.runtime/);
assert.match(generator,/destinations\.length!==60/);

const productOnly=getPermittedDestinations(["products.view"]);
assert.ok(productOnly.some((item)=>item.surface==="AD-C-01"));
assert.ok(productOnly.some((item)=>item.surface==="AD-C-02"));
assert.ok(!productOnly.some((item)=>item.surface==="AD-C-05"));
assert.ok(getPermittedDestinations([]).some((item)=>item.surface==="AD-B-02"));
assert.equal(findPermittedDestination("AD-C-05",["products.view"]),null);
assert.equal(findPermittedDestination("AD-C-05",["brands.manage"])?.surface,"AD-C-05");
const groups=getPermittedGroups(["products.view"]);
assert.ok(groups.some((group)=>group.id==="merchandising"));
assert.ok(!groups.some((group)=>group.id==="admin-home"));
assert.match(read("app/navigation/destination-policy.ts"),/some\(\(required\)=>\s*required\.every/);

assert.match(context,/\/admin\/auth\/session/);
assert.match(context,/\/admin\/me\/permissions/);
assert.match(context,/\/admin\/me\/scopes/);
assert.match(context,/value\.length>512/);
assert.match(context,/value\.length>256/);
assert.match(context,/warehouse/);
assert.match(context,/physical_store/);
assert.match(context,/UUID_PATTERN/);
assert.doesNotMatch(context,/scope.*(?:write|patch|post|put)/i);

assert.match(authenticated,/getPermittedGroups\(context\.permissions\)/);
assert.doesNotMatch(authenticated,/permissions:context\.permissions/);
assert.match(authenticated,/scopes:context\.scopes/);
assert.match(shell,/allDestinations/);
assert.match(shell,/normalizeSearch/);
assert.doesNotMatch(shell,/fetch\(|requestAdmin|\/admin\/me|\/admin\/products|localStorage|sessionStorage/);

assert.match(routes,/destinations\/:surfaceId/);
assert.match(destination,/findPermittedDestination/);
assert.match(destination,/kind:"denied"/);
assert.match(destination,/status:403/);
assert.match(destination,/دربارهٔ وجود یا جزئیات مقصد اطلاعات بیشتری نمایش داده نمی‌شود/);
assert.match(destination,/admin-breadcrumb/);
assert.doesNotMatch(destination,/\/admin\/(?:products|orders|inventory|customers|finance|security|dashboard)/);
assert.doesNotMatch(destination,/POST|PATCH|PUT|DELETE|fetch\(/);

assert.doesNotMatch(appText,/\/admin\/dashboard/);
assert.doesNotMatch(appText,/\/admin\/auth\/step-up/);
assert.doesNotMatch(appText,/localStorage|sessionStorage|pre_auth_token|session_token/);

assert.equal(task.risk,"MEDIUM");
assert.equal(task.human_gate_required,false);
assert.equal(task.canonical.base_sha,"32756cee24d7f60e63c768472e571c21eb2ec04f");
assert.ok(task.scope.forbidden.includes("contracts/**"));
assert.ok(task.scope.forbidden.includes("src/**"));
assert.ok(task.scope.forbidden.includes("docs/13-product-design/**"));

console.log(JSON.stringify({
  status:"PASS",
  stage:"67-E",
  generatedDestinations:ADMIN_DESTINATIONS.length,
  allRequiredPerOperation:true,
  rawPermissionsClientProjection:false,
  serverScopesReadOnly:true,
  localDestinationSearchOnly:true,
  neutralDeepLinkDenial:true,
  dashboardDeferred:true,
  stepUpDeferred:true,
  humanGateRequired:false
},null,2));
