import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ADMIN_SURFACE_STATE_COPY, ADMIN_SURFACE_STATE_KINDS } from "../app/platform/state/admin-surface-state.js";

const root=resolve("apps/admin");
const read=(path:string)=>readFileSync(resolve(root,path),"utf8");
const repoRead=(path:string)=>readFileSync(resolve(path),"utf8");

assert.deepEqual(ADMIN_SURFACE_STATE_KINDS,["loading","empty","error","denied","conflict","unavailable"]);
for(const kind of ADMIN_SURFACE_STATE_KINDS){
  const copy=ADMIN_SURFACE_STATE_COPY[kind];
  assert.ok(copy.kicker.trim().length>0,"STATE_KICKER_MISSING:"+kind);
  assert.ok(copy.title.trim().length>0,"STATE_TITLE_MISSING:"+kind);
  assert.ok(copy.description.trim().length>0,"STATE_DESCRIPTION_MISSING:"+kind);
}

const component=read("app/platform/state/AdminSurfaceState.tsx");
const model=read("app/platform/state/admin-surface-state.ts");
const dashboard=read("app/routes/foundation.tsx");
const authenticated=read("app/routes/authenticated.tsx");
const destination=read("app/routes/destination.tsx");
const shell=read("app/shell/AdminShell.tsx");
const rootSource=read("app/root.tsx");
const packageJson=JSON.parse(read("package.json")) as {scripts:Record<string,string>};
const design=repoRead("docs/13-product-design/step56-wireframes/B/AD-B-03/README.md");
const traceability=repoRead("docs/13-product-design/step56-wireframes/B/AD-B-03/traceability.json");
const task=JSON.parse(repoRead("docs/14-multi-agent/tasks/EQCOFE-STEP67-G-DASHBOARD-STATES-001.json")) as {
  risk:string;
  human_gate_required:boolean;
  canonical:{base_sha:string};
  scope:{write:string[];forbidden:string[]};
};

for(const kind of ["loading","empty","error","denied","conflict"]) assert.ok(model.includes('"'+kind+'"'),"GLOBAL_STATE_MISSING:"+kind);
assert.match(component,/aria-busy=\{kind === "loading"/);
assert.match(component,/role=\{role\}/);
assert.match(component,/useId\(\)/);
assert.match(component,/data-admin-state=\{kind\}/);
assert.match(component,/شناسه پیگیری/);
assert.match(model,/بازنویسی خاموش یا تکرار خودکار عملیات انجام نمی‌شود/);

assert.match(dashboard,/kind="unavailable"/);
assert.match(dashboard,/groups\.map/);
assert.match(dashboard,/group\.destinations\.map/);
assert.match(dashboard,/encodeURIComponent\(destination\.surface\)/);
assert.doesNotMatch(dashboard,/fetch\(|requestAdmin|\/admin\/dashboard/);
assert.doesNotMatch(dashboard,/metric|notificationCount|healthStatus|orderCount|revenue/i);

assert.match(authenticated,/AdminSurfaceState/);
assert.match(authenticated,/kind="error"/);
assert.match(destination,/kind="error"/);
assert.match(destination,/kind="denied"/);
assert.match(shell,/67-G/);
assert.ok(shell.includes("<Outlet context={{groups}} />"),"DASHBOARD_OUTLET_CONTEXT_MISSING");
assert.match(rootSource,/styles\/states\.css/);
assert.match(packageJson.scripts.verify??"",/stepup-credentials:verify.*dashboard-states:verify/);

assert.match(design,/GET \/admin\/dashboard is contract-only and unresolved/);
assert.match(design,/Only unavailable concept evidence is permitted/);
assert.match(design,/Static known authorized destination links/);
assert.match(traceability,/"executionAuthority": "NO_ACTION_UNTIL_CANONICAL_RECONCILIATION"/);
assert.match(traceability,/"coverage": "UNAVAILABLE_ONLY"/);

const appText=[component,model,dashboard,authenticated,destination,shell].join("\n");
assert.doesNotMatch(appText,/\/admin\/dashboard/);
assert.doesNotMatch(appText,/localStorage|sessionStorage/);

assert.equal(task.risk,"MEDIUM");
assert.equal(task.human_gate_required,false);
assert.equal(task.canonical.base_sha,"f40bd2cfc60243adc2611a5070d94191732af7b6");
assert.ok(task.scope.write.includes("apps/admin/**"));
assert.ok(task.scope.forbidden.includes("contracts/**"));
assert.ok(task.scope.forbidden.includes("src/**"));
assert.ok(task.scope.forbidden.includes("docs/13-product-design/**"));

console.log(JSON.stringify({
  status:"PASS",
  stage:"67-G",
  dashboardAuthority:"UNRESOLVED_NOT_GRANTED",
  dashboardRuntimeConsumption:false,
  fabricatedMetrics:false,
  staticAuthorizedDestinations:true,
  globalStates:["loading","empty","error","denied","conflict"],
  humanGateRequired:false
},null,2));
