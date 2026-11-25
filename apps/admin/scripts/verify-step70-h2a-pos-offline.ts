import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {validateOfflineBody,projectOffline} from "../app/operations/pos-offline.server.js";
const repo=resolve(fileURLToPath(new URL("../..",import.meta.url)),"..");
const read=(path:string)=>readFileSync(resolve(repo,path),"utf8");
const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP70-H2A-POS-OFFLINE-RECONCILIATION-READ-001.json"));
const route=read("apps/admin/app/routes/pos-offline.tsx"),transport=read("apps/admin/app/operations/pos-offline.server.ts");
const controller=read("src/modules/pos/presentation/pos-admin.controller.ts");
const paths=["/admin/pos/offline/commands","/admin/pos/offline/commands/{clientCommandId}/sync","/admin/pos/reconciliation/failed","/admin/pos/reconciliation/{clientCommandId}"];
const id="12345678-1234-4234-8234-123456789012";
assert.equal(task.risk,"HIGH");assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"f0a01c76a65a71a8d30b1d51bdcd1420225b532a");
assert.equal(task.scope.write.length,9);assert.deepEqual(task.scope.write,task.task_risk_rules[0].paths);
assert.equal(task.evidence.operation_count,4);
assert.ok(task.owner_internal_security_assurance.activation_scope.includes("NOT_IN_PR428_ALLOWLIST"));
for(const p of paths)assert.ok(transport.includes('"'+p+'"'),"MISSING_ENDPOINT:"+p);
for(const s of ["pos.offline.capture","pos.offline.sync"])assert.ok(controller.includes("@RequireIdempotency('"+s+"')"));
assert.ok(controller.includes("@Permissions('pos.reconcile')"));
assert.ok(route.includes('auth.permissions.includes("pos.sell")')&&route.includes('auth.permissions.includes("pos.reconcile")'));
assert.ok(route.includes("isTrustedOperationsFormOrigin(request)")&&route.includes("auth.scopes.some"));
assert.ok(route.includes('operationsText(reference,120)===null'),"INVALID_REFERENCE_MUST_FAIL_CLOSED");
assert.ok(transport.includes('randomUUID()')&&transport.includes('"Idempotency-Key":key'));
assert.ok(!route.includes('name="idempotency_key"')&&!route.includes('name="step_up_token"'));
assert.ok(!transport.includes('"/admin/pos/reconciliation/{clientCommandId}/retry"'));
assert.ok(!transport.includes('"/admin/pos/reconciliation/{clientCommandId}/abandon"'));
assert.ok(!route.includes('intent==="retry"')&&!route.includes('intent==="abandon"'));
assert.ok(read("apps/admin/app/routes.ts").includes('route("pos/offline", "./routes/pos-offline.tsx")'));
assert.ok(read("apps/admin/app/routes/destination.tsx").includes('destination.surface==="AD-E-11"'));
const example={warehouse_id:id,customer_type:"retail",payment_method:"card",lines:[{variant_id:id,quantity:1}]};
assert.equal(validateOfflineBody(example).ok,true);
for(const bad of [
  {...example,warehouse_id:"wrong"},{...example,customer_type:"admin"},{...example,payment_method:"bank"},
  {...example,extra:1},{...example,lines:[]},{...example,lines:Array(101).fill({variant_id:id,quantity:1})},
  {...example,lines:[{variant_id:id,quantity:0}]},{...example,lines:[{variant_id:id,quantity:1000}]},
  {...example,lines:[{variant_id:id,quantity:1,total_toman:0}]},{...example,external_reference:"X".repeat(121)},
  {...example,external_reference:null},{...example,external_reference:"evil\nref"}
])assert.equal(validateOfflineBody(bad).ok,false);
assert.deepEqual(projectOffline({client_command_id:id,status:"failed",recovery_count:2,error_code:"OFFLINE_FAILED",payload:{credit_card:"SECRET"}}),{client_command_id:id,status:"failed",recovery_count:2,error_code:"OFFLINE_FAILED"});
assert.equal(projectOffline({client_command_id:id,status:"wrong",recovery_count:1}),null);
assert.equal(projectOffline({client_command_id:id,status:"queued",recovery_count:6}),null);
assert.ok(JSON.parse(read("apps/admin/package.json")).scripts.verify.includes("step70-pos-offline:verify"));
console.log("H2A POS offline four source-bound operations; negative validation and security PASS");
