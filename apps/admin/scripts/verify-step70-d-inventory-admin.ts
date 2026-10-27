import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  formatInventoryIfMatch,
  validateInventoryAdjustment,
  validateWarehouseProtection,
} from "../app/operations/inventory-admin.server.js";
import { isTrustedOperationsFormOrigin } from "../app/operations/operations-form.server.js";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");

const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP70-D-INVENTORY-ADMIN-001.json")) as {
  risk:string;human_gate_required:boolean;canonical:{base_sha:string};
  evidence:{surfaces:string[];read_authority:string[];mutation_authority:string[];adjustment:{adjustment_types:string[]}};
  scope:{forbidden:string[]};
};
const server=read("apps/admin/app/operations/inventory-admin.server.ts");
const route=read("apps/admin/app/routes/inventory.tsx");
const routes=read("apps/admin/app/routes.ts");
const destination=read("apps/admin/app/routes/destination.tsx");
const controller=read("src/modules/inventory/presentation/inventory.controller.ts");
const runtime=read("src/modules/inventory/application/inventory.service.ts");
const generated=read("src/generated/openapi.ts");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};

assert.equal(task.risk,"HIGH");
assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"7d7b1468e33b0ec0c7e0e47061e50bb63e72374c");
assert.deepEqual(task.evidence.surfaces,["AD-D-06","AD-D-07","AD-D-11"]);
assert.deepEqual(task.evidence.adjustment.adjustment_types,[...INVENTORY_ADJUSTMENT_TYPES]);
for(const forbidden of ["contracts/**","database/**","src/**","test/**","scripts/**","apps/storefront/**","docs/12-current-state/**","docs/13-product-design/**"]){
  assert.ok(task.scope.forbidden.includes(forbidden),"STEP70_D_FORBIDDEN:"+forbidden);
}

assert.deepEqual(task.evidence.read_authority,[
  "GET /admin/inventory",
  "GET /admin/inventory/{variant_id}",
  "GET /admin/inventory/{variant_id}/movements",
  "GET /admin/inventory/{variant_id}/cost-basis",
  "GET /admin/inventory/{variant_id}/cost-layers",
  "GET /admin/inventory/warehouses",
]);
assert.deepEqual(task.evidence.mutation_authority,[
  "POST /admin/inventory/adjustments",
  "PATCH /admin/inventory/warehouses/{id}/protection",
]);

for(const endpoint of [
  '"/admin/inventory"',
  '"/admin/inventory/{variant_id}"',
  '"/admin/inventory/{variant_id}/movements"',
  '"/admin/inventory/{variant_id}/cost-basis"',
  '"/admin/inventory/{variant_id}/cost-layers"',
  '"/admin/inventory/warehouses"',
  '"/admin/inventory/adjustments"',
  '"/admin/inventory/warehouses/{id}/protection"',
])assert.ok(server.includes(endpoint),"STEP70_D_ENDPOINT:"+endpoint);

assert.ok(server.includes('createAdminAuthBridge(request,{stepUpToken})'),"STEP70_D_ADJUSTMENT_STEPUP_BRIDGE");
assert.ok(server.includes('headers:{"Idempotency-Key":idempotencyKey}'),"STEP70_D_SERVER_IDEMPOTENCY");
assert.ok(server.includes('randomUUID()'),"STEP70_D_SERVER_OWNED_IDEMPOTENCY");
assert.ok(server.includes('headers:{"If-Match":formatInventoryIfMatch(expectedVersion)}'),"STEP70_D_PROTECTION_IF_MATCH");
assert.equal(formatInventoryIfMatch(7),'"7"');
assert.throws(()=>formatInventoryIfMatch(0));

assert.ok(controller.includes("@Permissions('inventory.adjust') @RequireStepUp() @RequireIdempotency('inventory.adjust')"),"STEP70_D_RUNTIME_ADJUST_SECURITY");
assert.ok(controller.includes("@Permissions('inventory.warehouse.manage') @Patch('admin/inventory/warehouses/:id/protection')"),"STEP70_D_RUNTIME_PROTECTION");
assert.ok(runtime.includes("pct<0||pct>100"),"STEP70_D_RUNTIME_PROTECTION_BOUND");
assert.ok(runtime.includes("input.quantity_delta===0"),"STEP70_D_RUNTIME_NONZERO");
assert.ok(runtime.includes("COST_BASIS_REQUIRED"),"STEP70_D_RUNTIME_COST_REQUIRED");
assert.ok(runtime.includes("encumbered"),"STEP70_D_RUNTIME_ENCUMBERED_GUARD");
assert.ok(runtime.includes("fifoLayers"),"STEP70_D_RUNTIME_FIFO");

const good=validateInventoryAdjustment({
  warehouseId:"11111111-1111-4111-8111-111111111111",
  variantId:"22222222-2222-4222-8222-222222222222",
  quantityDelta:3,
  adjustmentType:"count_correction",
  reason:"اصلاح شمارش",
  unitCostToman:120000,
});
assert.equal(good.ok,true);
assert.equal(validateInventoryAdjustment({
  warehouseId:"11111111-1111-4111-8111-111111111111",
  variantId:"22222222-2222-4222-8222-222222222222",
  quantityDelta:3,
  adjustmentType:"count_correction",
  reason:"اصلاح",
  unitCostToman:null,
}).ok,false);
assert.equal(validateInventoryAdjustment({
  warehouseId:"11111111-1111-4111-8111-111111111111",
  variantId:"22222222-2222-4222-8222-222222222222",
  quantityDelta:0,
  adjustmentType:"manual",
  reason:"اصلاح",
  unitCostToman:0,
}).ok,false);
for(const type of ["damage","quarantine","quarantine_release","damaged_disposal"]){
  assert.equal(validateInventoryAdjustment({
    warehouseId:"11111111-1111-4111-8111-111111111111",
    variantId:"22222222-2222-4222-8222-222222222222",
    quantityDelta:-1,
    adjustmentType:type,
    reason:"اصلاح bucket",
    unitCostToman:null,
  }).ok,false,"STEP70_D_POSITIVE_BUCKET:"+type);
}
assert.equal(validateWarehouseProtection({
  warehouseId:"11111111-1111-4111-8111-111111111111",expectedVersion:2,percent:20,
}).ok,true);
assert.equal(validateWarehouseProtection({
  warehouseId:"11111111-1111-4111-8111-111111111111",expectedVersion:0,percent:101,
}).ok,false);

assert.equal(isTrustedOperationsFormOrigin(new Request("https://admin.eqcofe.test/inventory/adjustment",{headers:{origin:"https://admin.eqcofe.test"}})),true);
assert.equal(isTrustedOperationsFormOrigin(new Request("https://admin.eqcofe.test/inventory/adjustment",{headers:{origin:"https://evil.example"}})),false);

assert.ok(route.includes("runAdminWebAuthn"),"STEP70_D_WEBAUTHN_CLIENT");
assert.ok(route.includes("createAdminStepUpChallenge"),"STEP70_D_STEPUP_CHALLENGE");
assert.ok(route.includes("verifyAdminStepUp"),"STEP70_D_STEPUP_VERIFY");
assert.ok(route.includes("درخواست خودکار تکرار نمی‌شود"),"STEP70_D_NO_AUTO_RETRY");
assert.ok(route.includes("هیچ overwrite خودکاری انجام نمی‌شود"),"STEP70_D_NO_CONFLICT_OVERWRITE");
assert.ok(route.includes("shape داده را حدس نمی‌زند"),"STEP70_D_NO_RESPONSE_INVENTION");
assert.ok(routes.includes('route("inventory/:view", "./routes/inventory.tsx")'),"STEP70_D_ROUTE");
for(const [surface,target] of [["AD-D-06","/inventory/overview"],["AD-D-07","/inventory/adjustment"],["AD-D-11","/inventory/warehouses"]]){
  assert.ok(destination.includes(`destination.surface==="${surface}"`),"STEP70_D_DEST:"+surface);
  assert.ok(destination.includes(`redirect("${target}"`),"STEP70_D_TARGET:"+surface);
}

for(const forbiddenEndpoint of [
  "/admin/inventory/transfers",
  "/admin/inventory/reservations",
  "/admin/inventory/allocations",
  "/admin/inventory/consume-sale",
  'client.request("post","/admin/inventory/warehouses"',
]){
  assert.ok(!server.includes(forbiddenEndpoint),"STEP70_D_LATER_STAGE_AUTHORITY:"+forbiddenEndpoint);
}

assert.ok(generated.includes("InventoryAdjustmentRequest: {"),"STEP70_D_GENERATED_ADJUSTMENT");
assert.ok(generated.includes("WarehouseProtectionRequest: {"),"STEP70_D_GENERATED_PROTECTION");
assert.ok(generated.includes('"Idempotency-Key": components["parameters"]["IdempotencyKey"]'),"STEP70_D_GENERATED_IDEMPOTENCY");
assert.ok(generated.includes('"If-Match": components["parameters"]["IfMatch"]'),"STEP70_D_GENERATED_IF_MATCH");

assert.equal(packageJson.scripts["step70-inventory:verify"],"pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step70-d-inventory-admin.ts");
assert.ok((packageJson.scripts.verify??"").includes("step70-inventory:verify"),"STEP70_D_VERIFY_CHAIN");

console.log("Step 70-D Inventory administration verification: PASS");
