import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateAllocationCreate,
  validateConsumeSale,
  validateReservationCreate,
  validateTransferCreate,
} from "../app/operations/inventory-flow-admin.server.js";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");

const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP70-E-INVENTORY-FLOW-ADMIN-001.json")) as {
  risk:string;human_gate_required:boolean;canonical:{base_sha:string};
  evidence:{surfaces:string[];read_authority:string[];idempotent_mutations:string[];non_idempotent_mutations:string[];step_up_required:boolean};
  scope:{forbidden:string[]};
};
const server=read("apps/admin/app/operations/inventory-flow-admin.server.ts");
const route=read("apps/admin/app/routes/inventory-flows.tsx");
const routes=read("apps/admin/app/routes.ts");
const destination=read("apps/admin/app/routes/destination.tsx");
const controller=read("src/modules/inventory/presentation/inventory.controller.ts");
const flow=read("src/modules/inventory/application/allocation-transfer.service.ts");
const inventory=read("src/modules/inventory/application/inventory.service.ts");
const generated=read("src/generated/openapi.ts");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};

assert.equal(task.risk,"HIGH");
assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"acbb8e35a29bdffec27d1ea9d7ce12ea4c402a01");
assert.deepEqual(task.evidence.surfaces,["AD-D-08","AD-D-09","AD-D-10"]);
assert.equal(task.evidence.step_up_required,false);
assert.equal(task.evidence.idempotent_mutations.length,8);
assert.equal(task.evidence.non_idempotent_mutations.length,9);
for(const forbidden of ["contracts/**","database/**","src/**","test/**","scripts/**","apps/storefront/**","docs/12-current-state/**","docs/13-product-design/**"]){
  assert.ok(task.scope.forbidden.includes(forbidden),"STEP70_E_FORBIDDEN:"+forbidden);
}

assert.deepEqual(task.evidence.read_authority,[
  "GET /admin/inventory/transfers",
  "GET /admin/inventory/transfers/{id}",
  "GET /admin/inventory/reservations",
  "GET /admin/inventory/reservations/{id}",
  "GET /admin/inventory/allocations",
]);

const idempotentPaths=[
  "/admin/inventory/transfers",
  "/admin/inventory/transfers/{id}/ship",
  "/admin/inventory/transfers/{id}/receive",
  "/admin/inventory/reservations",
  "/admin/inventory/reservations/{id}/late-payment-review",
  "/admin/inventory/reservations/{id}/convert",
  "/admin/inventory/allocations",
  "/admin/inventory/consume-sale",
];
for(const path of idempotentPaths)assert.ok(server.includes(`"${path}"`),"STEP70_E_IDEMPOTENT_PATH:"+path);
assert.equal((server.match(/"Idempotency-Key":bridge\.key/g)??[]).length,8,"STEP70_E_EXACT_IDEMPOTENCY_COUNT");
assert.ok(server.includes("const key=randomUUID()"),"STEP70_E_SERVER_OWNED_KEYS");
assert.ok(!route.includes("Idempotency-Key"),"STEP70_E_BROWSER_NO_KEY");
assert.ok(!server.includes("stepUpToken"),"STEP70_E_NO_STEPUP_INVENTION");

for(const path of [
  "/admin/inventory/transfers/{id}/approve",
  "/admin/inventory/transfers/{id}/cancel",
  "/admin/inventory/reservations/{id}/begin-payment",
  "/admin/inventory/reservations/{id}/release",
  "/admin/inventory/reservations/{id}/release-commitment",
  "/admin/inventory/reservations/{id}/expire",
  "/admin/inventory/allocations/{id}/pick",
  "/admin/inventory/allocations/{id}/unpick",
  "/admin/inventory/allocations/{id}/release",
])assert.ok(server.includes(`"${path}"`),"STEP70_E_NON_IDEMPOTENT_PATH:"+path);

assert.ok(controller.includes("@RequireIdempotency('inventory.transfer.create')"),"STEP70_E_TRANSFER_CREATE_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.transfer.ship')"),"STEP70_E_TRANSFER_SHIP_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.transfer.receive')"),"STEP70_E_TRANSFER_RECEIVE_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.reserve')"),"STEP70_E_RESERVE_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.convert') @Post('admin/inventory/reservations/:id/late-payment-review')"),"STEP70_E_LATE_REVIEW_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.convert') @Post('admin/inventory/reservations/:id/convert')"),"STEP70_E_CONVERT_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.allocate')"),"STEP70_E_ALLOCATE_IDEM");
assert.ok(controller.includes("@RequireIdempotency('inventory.consume')"),"STEP70_E_CONSUME_IDEM");

const transfer=validateTransferCreate({
  source_warehouse_id:"11111111-1111-4111-8111-111111111111",
  destination_warehouse_id:"22222222-2222-4222-8222-222222222222",
  items:[{variant_id:"33333333-3333-4333-8333-333333333333",quantity:2}],
});
assert.equal(transfer.ok,true);
assert.equal(validateTransferCreate({
  source_warehouse_id:"11111111-1111-4111-8111-111111111111",
  destination_warehouse_id:"11111111-1111-4111-8111-111111111111",
  items:[{variant_id:"33333333-3333-4333-8333-333333333333",quantity:2}],
}).ok,false);
assert.equal(validateTransferCreate({
  source_warehouse_id:"11111111-1111-4111-8111-111111111111",
  destination_warehouse_id:"22222222-2222-4222-8222-222222222222",
  items:[
    {variant_id:"33333333-3333-4333-8333-333333333333",quantity:2},
    {variant_id:"33333333-3333-4333-8333-333333333333",quantity:1},
  ],
}).ok,false);

const future="2099-01-01T00:00:00.000Z";
assert.equal(validateReservationCreate({
  cart_id:null,order_id:null,customer_id:null,
  expires_at:future,payment_grace_until:"2099-01-02T00:00:00.000Z",
  items:[{warehouse_id:"11111111-1111-4111-8111-111111111111",variant_id:"33333333-3333-4333-8333-333333333333",quantity:1}],
},0).ok,true);
assert.equal(validateReservationCreate({
  cart_id:null,order_id:null,customer_id:null,
  expires_at:"2020-01-01T00:00:00.000Z",payment_grace_until:null,
  items:[{warehouse_id:"11111111-1111-4111-8111-111111111111",variant_id:"33333333-3333-4333-8333-333333333333",quantity:1}],
},Date.parse("2026-01-01T00:00:00.000Z")).ok,false);
assert.equal(validateReservationCreate({
  cart_id:null,order_id:null,customer_id:null,
  expires_at:future,payment_grace_until:"2098-01-01T00:00:00.000Z",
  items:[{warehouse_id:"11111111-1111-4111-8111-111111111111",variant_id:"33333333-3333-4333-8333-333333333333",quantity:1}],
},0).ok,false);

assert.equal(validateAllocationCreate({
  order_item_id:"44444444-4444-4444-8444-444444444444",
  warehouse_id:"11111111-1111-4111-8111-111111111111",
  variant_id:"33333333-3333-4333-8333-333333333333",
  quantity:1,reservation_id:null,
}).ok,true);
assert.equal(validateAllocationCreate({
  order_item_id:"44444444-4444-4444-8444-444444444444",
  warehouse_id:"11111111-1111-4111-8111-111111111111",
  variant_id:"33333333-3333-4333-8333-333333333333",
  quantity:0,reservation_id:null,
}).ok,false);
assert.equal(validateConsumeSale({allocation_id:"55555555-5555-4555-8555-555555555555"}).ok,true);
assert.equal(validateConsumeSale({allocation_id:"bad"}).ok,false);

assert.ok(flow.includes("input.source_warehouse_id===input.destination_warehouse_id"),"STEP70_E_TRANSFER_DISTINCT");
assert.ok(flow.includes("DUPLICATE_TRANSFER_ITEM"),"STEP70_E_TRANSFER_UNIQUE");
assert.ok(flow.includes("consumeFifo"),"STEP70_E_TRANSFER_FIFO");
assert.ok(inventory.includes("INVALID_RESERVATION_EXPIRY"),"STEP70_E_RESERVATION_FUTURE");
assert.ok(inventory.includes("DUPLICATE_RESERVATION_ITEM"),"STEP70_E_RESERVATION_UNIQUE");
assert.ok(flow.includes("RESERVATION_ALLOCATION_EXCEEDED"),"STEP70_E_RESERVATION_ALLOCATION");
assert.ok(flow.includes("a.status!=='picked'")||inventory.includes("allocation.status!=='picked'"),"STEP70_E_CONSUME_PICKED");
assert.ok(inventory.includes("insertCostConsumption"),"STEP70_E_COGS");

assert.ok(route.includes("هیچ retry خودکاری انجام نمی‌شود"),"STEP70_E_NO_AUTO_RETRY");
assert.ok(route.includes("response-shape حدسی"),"STEP70_E_NO_SHAPE_INVENTION");
assert.ok(routes.includes('route("inventory-flows/:view", "./routes/inventory-flows.tsx")'),"STEP70_E_ROUTE");
for(const [surface,target] of [["AD-D-08","/inventory-flows/transfers"],["AD-D-09","/inventory-flows/reservations"],["AD-D-10","/inventory-flows/allocations"]]){
  assert.ok(destination.includes(`destination.surface==="${surface}"`),"STEP70_E_DEST:"+surface);
  assert.ok(destination.includes(`redirect("${target}"`),"STEP70_E_TARGET:"+surface);
}

for(const forbiddenEndpoint of [
  "/admin/procurement/",
  "/admin/pos/",
  "/admin/inventory/adjustments",
  "/admin/inventory/warehouses/{id}/protection",
]){
  assert.ok(!server.includes(forbiddenEndpoint),"STEP70_E_NEGATIVE_AUTHORITY:"+forbiddenEndpoint);
}
for(const schema of ["InventoryTransferCreateRequest","InventoryReservationRequest","InventoryAllocationRequest","InventoryConsumeSaleRequest"]){
  assert.ok(generated.includes(schema+": {"),"STEP70_E_GENERATED_SCHEMA:"+schema);
}

assert.equal(packageJson.scripts["step70-flow:verify"],"pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step70-e-inventory-flow-admin.ts");
assert.ok((packageJson.scripts.verify??"").includes("step70-flow:verify"),"STEP70_E_VERIFY_CHAIN");

console.log("Step 70-E inventory flow administration verification: PASS");
