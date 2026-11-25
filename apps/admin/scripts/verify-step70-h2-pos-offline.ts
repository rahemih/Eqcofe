import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateClientCommandId,validateLimit,validateNote,validateOfflinePayload,
  projectCommand,projectFailedList,projectInspection
} from "../app/operations/pos-offline.server.js";
const repo=resolve(fileURLToPath(new URL("../..",import.meta.url)),"..");
const read=(path:string)=>readFileSync(resolve(repo,path),"utf8");
const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP70-H2-POS-OFFLINE-RECONCILIATION-ADMIN-001.json"));
const route=read("apps/admin/app/routes/pos-offline.tsx");
const transport=read("apps/admin/app/operations/pos-offline.server.ts");
const controller=read("src/modules/pos/presentation/pos-admin.controller.ts");
const backend=read("src/modules/pos/application/pos-admin-reconciliation.service.ts");
const salesBackend=read("src/modules/pos/application/offline-command-sync.service.ts");
const routes=read("apps/admin/app/routes.ts"),destination=read("apps/admin/app/routes/destination.tsx");
const uuid="12345678-1234-4234-8234-123456789012",other="22345678-1234-4234-8234-123456789012";
assert.equal(task.risk,"HIGH");assert.equal(task.risk_floor,"HIGH");assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"f0a01c76a65a71a8d30b1d51bdcd1420225b532a");
assert.deepEqual(task.evidence.surfaces,["AD-E-11"]);assert.equal(task.evidence.operation_count,6);
assert.equal(task.scope.write.length,9);assert.deepEqual(task.scope.write,task.task_risk_rules[0].paths);
for(const p of ["src/modules/pos/**","src/platform/**","contracts/**","src/generated/**",".github/**","docs/13-product-design/**","apps/storefront/**"]){
  assert.ok(task.scope.forbidden.includes(p),p);
}
assert.ok(routes.includes('route("pos/offline", "./routes/pos-offline.tsx")'));
assert.ok(destination.includes('destination.surface==="AD-E-11"')&&destination.includes('redirect("/pos/offline"'));
assert.ok(route.includes('readAdminAuthorizationContext(request)')&&route.includes('auth.permissions.includes("pos.sell")')
  &&route.includes('auth.permissions.includes("pos.reconcile")')&&route.includes("isTrustedOperationsFormOrigin(request)"));
assert.ok(route.includes('createAdminStepUpChallenge(request)')&&route.includes('verifyAdminStepUp(request,credential as StepUpBody)'));
assert.ok(route.includes('runAdminWebAuthn("authentication"')&&route.includes("verified.token"));
assert.ok(transport.includes('createAdminAuthBridge(request,stepUpToken?{stepUpToken}:{})'));
assert.ok(!route.includes('"X-Step-Up-Token"')&&!route.includes('step_up_token'));
assert.ok(transport.includes('{"Idempotency-Key":commandId}')&&transport.includes("const key=randomUUID()"));
assert.ok(transport.includes('unknown_outcome')&&route.includes("هیچ retry خودکاری"));
const paths=[
  "/admin/pos/offline/commands",
  "/admin/pos/offline/commands/{clientCommandId}/sync",
  "/admin/pos/reconciliation/failed",
  "/admin/pos/reconciliation/{clientCommandId}",
  "/admin/pos/reconciliation/{clientCommandId}/retry",
  "/admin/pos/reconciliation/{clientCommandId}/abandon"
];
for(const p of paths)assert.ok(transport.includes('"'+p+'"'),"MISSING_SOURCE_ENDPOINT:"+p);
for(const scope of ["pos.offline.capture","pos.offline.sync","pos.reconciliation.admin.retry","pos.reconciliation.admin.abandon"])
  assert.ok(controller.includes("@RequireIdempotency('"+scope+"')"),"MISSING_SOURCE_SCOPE:"+scope);
assert.ok(controller.includes("@RequireStepUp()")&&controller.includes("@Permissions('pos.reconcile')"));
assert.ok(backend.includes(">=5")&&backend.includes("status)!=='failed'"));
assert.ok(salesBackend.includes("this.scopes.assert(actor,'warehouse',payload.warehouse_id)"));
assert.ok(validateClientCommandId(uuid));assert.ok(!validateClientCommandId("bad"));
assert.ok(validateLimit(1)&&validateLimit(100)&&!validateLimit(0)&&!validateLimit(101));
const payload={warehouse_id:uuid,customer_type:"retail",payment_method:"card",external_reference:null,
  lines:[{variant_id:uuid,quantity:1},{variant_id:uuid,quantity:2},{variant_id:other,quantity:3}]};
const valid=validateOfflinePayload(payload);assert.equal(valid.ok,true);
if(!valid.ok)throw new Error("PAYLOAD_INVALID");
assert.equal(valid.body.lines.length,2);assert.equal(valid.body.lines.find(x=>x.variant_id===uuid)?.quantity,3);
for(const bad of [
  {...payload,warehouse_id:"not-uuid"}, {...payload,customer_type:"company"},
  {...payload,payment_method:"bank"}, {...payload,total_toman:1},
  {...payload,lines:[]},{...payload,lines:Array(101).fill({variant_id:uuid,quantity:1})},
  {...payload,lines:[{variant_id:uuid,quantity:0}]},
  {...payload,lines:[{variant_id:uuid,quantity:500},{variant_id:uuid,quantity:500}]},
  {...payload,lines:[{variant_id:uuid,quantity:1,unit_price_toman:1}]},
  {...payload,external_reference:"X".repeat(121)}
])assert.equal(validateOfflinePayload(bad).ok,false,"INVALID_PAYLOAD_ACCEPTED");
assert.equal(validateNote(null).ok,true);assert.equal(validateNote("درخواست بررسی").ok,true);
assert.equal(validateNote("X".repeat(501)).ok,false);assert.equal(validateNote("x\ny").ok,false);
const raw={id:uuid,client_command_id:other,staff_actor_id:uuid,command_type:"sale.sync",
  status:"failed",recovery_count:2,error_code:"POS_OFFLINE_SYNC_FAILED",payload:{secret:"never"}};
assert.deepEqual(projectCommand(raw),{id:uuid,clientCommandId:other,status:"failed",recoveryCount:2,errorCode:"POS_OFFLINE_SYNC_FAILED"});
assert.equal(projectCommand({...raw,recovery_count:6}),null);
assert.equal(projectCommand({...raw,command_type:"fake"}),null);
assert.equal(projectFailedList([raw])?.length,1);
assert.equal(projectFailedList([{...raw,status:"applied"}]),null);
const detail=projectInspection({command:raw,history:[{action:"retry_requested",recovery_count:2,
  prior_error_code:"RETRY",note:null,created_at:"2026-11-25T10:00:00Z",actor_id:uuid,secret:"no"}]});
assert.deepEqual(detail?.command,projectCommand(raw));assert.equal(detail?.history.length,1);
assert.equal(JSON.stringify(detail).includes("secret"),false);
assert.ok(JSON.parse(read("apps/admin/package.json")).scripts.verify.includes("step70-pos-offline:verify"));
console.log("Step70-H2 POS offline/reconciliation source-bound negative checks PASS");
