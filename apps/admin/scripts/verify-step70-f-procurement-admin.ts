import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validatePurchaseOrderCreate,
  validatePurchaseRequestCreate,
  validateSupplierCreate,
} from "../app/operations/procurement-admin.server.js";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");
const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP70-F-SUPPLIER-PR-PO-ADMIN-001.json")) as {
  risk:string;human_gate_required:boolean;canonical:{base_sha:string};
  evidence:{surfaces:string[];read_authority:string[];idempotent_mutations:string[];versioned_mutations:string[];step_up_mutations:string[]};
  scope:{write:string[];forbidden:string[]};
};
const server=read("apps/admin/app/operations/procurement-admin.server.ts");
const route=read("apps/admin/app/routes/procurement.tsx");
const routes=read("apps/admin/app/routes.ts");
const destination=read("apps/admin/app/routes/destination.tsx");
const controller=read("src/modules/procurement/presentation/procurement.controller.ts");
const service=read("src/modules/procurement/application/purchase.service.ts");
const supplierService=read("src/modules/procurement/application/supplier.service.ts");
const generated=read("src/generated/openapi.ts");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};

assert.equal(task.risk,"HIGH");
assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"5d2dbd3acdde3c993253e30391cf3701b3c84ba8");
assert.deepEqual(task.evidence.surfaces,["AD-D-12","AD-D-13","AD-D-14"]);
assert.equal(task.evidence.read_authority.length,6);
assert.equal(task.evidence.idempotent_mutations.length,3);
assert.equal(task.evidence.versioned_mutations.length,14);
assert.deepEqual(task.evidence.step_up_mutations,[
  "POST /admin/procurement/purchase-requests/{id}/approve",
  "POST /admin/procurement/purchase-requests/{id}/reject",
  "POST /admin/procurement/purchase-orders/{id}/approve",
]);
for(const forbidden of [".github/**","package.json","pnpm-lock.yaml","pnpm-workspace.yaml","database/**","test/**","scripts/**","apps/api/**","apps/worker/**","apps/scheduler/**","apps/storefront/**","docs/12-current-state/**","graphify-out/**","contracts/**","src/generated/**","src/platform/**","src/shared/**"]){
  assert.ok(task.scope.forbidden.includes(forbidden),"STEP70_F_FORBIDDEN:"+forbidden);
}
assert.ok(task.scope.write.includes("src/modules/procurement/presentation/procurement.controller.ts"),"STEP70_F_CONTROLLER_DRIFT_PATH");
assert.ok(!task.scope.write.includes("src/modules/**"),"STEP70_F_NO_BROAD_RUNTIME_WRITE");
const provenanceAllowlist=["docs/13-product-design/step56-admin-ux-contract.json","docs/13-product-design/step56-foundation/A/manifest.json","docs/13-product-design/step56-admin-shell-wireframes.json","docs/13-product-design/step56-wireframes/B/manifest.json","docs/13-product-design/step56-catalog-media-wireframes.json","docs/13-product-design/step56-wireframes/C/manifest.json","docs/13-product-design/step56-pricing-inventory-wireframes.json","docs/13-product-design/step56-wireframes/D/manifest.json","docs/13-product-design/step56-commerce-operations-wireframes.json","docs/13-product-design/step56-wireframes/E/manifest.json","docs/13-product-design/step56-customers-growth-wireframes.json","docs/13-product-design/step56-wireframes/F/manifest.json","docs/13-product-design/step56-management-security-wireframes.json","docs/13-product-design/step56-wireframes/G/manifest.json","docs/13-product-design/step56-final-audit.json","docs/13-product-design/step56-final-audit/manifest.json","docs/13-product-design/step57-high-fidelity-contract.json"] as const;
for(const path of provenanceAllowlist)assert.ok(task.scope.write.includes(path),"STEP70_F_PROVENANCE_ALLOWLIST:"+path);
assert.ok(!task.scope.write.includes("docs/13-product-design/**"),"STEP70_F_NO_BROAD_PRODUCT_DESIGN_WRITE");

for(const path of [
  "/admin/procurement/suppliers",
  "/admin/procurement/suppliers/{id}",
  "/admin/procurement/suppliers/{id}/activate",
  "/admin/procurement/suppliers/{id}/deactivate",
  "/admin/procurement/purchase-requests",
  "/admin/procurement/purchase-requests/{id}",
  "/admin/procurement/purchase-requests/{id}/submit",
  "/admin/procurement/purchase-requests/{id}/approve",
  "/admin/procurement/purchase-requests/{id}/reject",
  "/admin/procurement/purchase-requests/{id}/cancel",
  "/admin/procurement/purchase-orders",
  "/admin/procurement/purchase-orders/{id}",
  "/admin/procurement/purchase-orders/{id}/submit",
  "/admin/procurement/purchase-orders/{id}/approve",
  "/admin/procurement/purchase-orders/{id}/send",
  "/admin/procurement/purchase-orders/{id}/cancel",
  "/admin/procurement/purchase-orders/{id}/close",
])assert.ok(server.includes(`"${path}"`),"STEP70_F_PATH:"+path);

assert.equal((server.match(/"Idempotency-Key":bridge\.key/g)??[]).length,3,"STEP70_F_EXACT_IDEMPOTENCY_COUNT");
assert.ok(server.includes("const key=randomUUID()"),"STEP70_F_SERVER_OWNED_KEYS");
assert.ok(!route.includes('"Idempotency-Key":'),"STEP70_F_BROWSER_NO_IDEMPOTENCY_HEADER");
assert.ok(!route.includes('name="Idempotency-Key"'),"STEP70_F_BROWSER_NO_IDEMPOTENCY_FIELD");
assert.ok(!route.includes('form.get("idempotency'),"STEP70_F_BROWSER_NO_IDEMPOTENCY_INPUT");
assert.ok(route.includes("createAdminStepUpChallenge"),"STEP70_F_STEPUP_CHALLENGE");
assert.ok(route.includes("verifyAdminStepUp"),"STEP70_F_STEPUP_VERIFY");
assert.ok(route.includes('runAdminWebAuthn("authentication"'),"STEP70_F_WEBAUTHN");
assert.ok(server.includes("createAdminAuthBridge(request,{stepUpToken})"),"STEP70_F_STEPUP_BRIDGE");
assert.ok(route.includes("هیچ retry خودکاری انجام نمی‌شود"),"STEP70_F_NO_AUTO_RETRY");

assert.ok(controller.includes("@RequireIdempotency('procurement.supplier.create')"),"STEP70_F_SUPPLIER_IDEM");
assert.ok(controller.includes("@RequireIdempotency('procurement.request.create')"),"STEP70_F_PR_IDEM");
assert.ok(controller.includes("@RequireIdempotency('procurement.po.create')"),"STEP70_F_PO_IDEM");
assert.equal((controller.match(/@RequireStepUp\(\)/g)??[]).filter(Boolean).length>=3,true,"STEP70_F_STEPUP_RUNTIME");
assert.ok(controller.includes("b.resolution_note??b.reason??b.note"),"STEP70_F_CLOSE_RESOLUTION_DRIFT_REPAIRED");
assert.ok(service.includes("SEPARATION_OF_DUTIES"),"STEP70_F_SOD");
assert.ok(service.includes("PURCHASE_REQUEST_NOT_APPROVED"),"STEP70_F_PR_APPROVED_FOR_PO");
assert.ok(service.includes("WAREHOUSE_MISMATCH"),"STEP70_F_WAREHOUSE_MATCH");
assert.ok(service.includes("INVALID_DISCOUNT"),"STEP70_F_DISCOUNT_RULE");
assert.ok(supplierService.includes("payment_terms_days")&&supplierService.includes("terms<0"),"STEP70_F_PAYMENT_TERMS");

assert.equal(validateSupplierCreate({code:"SUP-1",name_fa:"تأمین‌کننده",payment_terms_days:30}).ok,true);
assert.equal(validateSupplierCreate({code:"",name_fa:"",payment_terms_days:-1}).ok,false);
assert.equal(validatePurchaseRequestCreate({
  warehouse_id:"11111111-1111-4111-8111-111111111111",reason:"نیاز",
  items:[{variant_id:"22222222-2222-4222-8222-222222222222",requested_quantity:2}],
}).ok,true);
assert.equal(validatePurchaseRequestCreate({
  warehouse_id:"11111111-1111-4111-8111-111111111111",reason:"نیاز",
  items:[
    {variant_id:"22222222-2222-4222-8222-222222222222",requested_quantity:2},
    {variant_id:"22222222-2222-4222-8222-222222222222",requested_quantity:1},
  ],
}).ok,false);
assert.equal(validatePurchaseOrderCreate({
  supplier_id:"33333333-3333-4333-8333-333333333333",
  warehouse_id:"11111111-1111-4111-8111-111111111111",
  items:[{variant_id:"22222222-2222-4222-8222-222222222222",ordered_quantity:2,unit_cost_toman:1000,discount_toman:100,tax_toman:0}],
}).ok,true);
assert.equal(validatePurchaseOrderCreate({
  supplier_id:"33333333-3333-4333-8333-333333333333",
  warehouse_id:"11111111-1111-4111-8111-111111111111",
  items:[{variant_id:"22222222-2222-4222-8222-222222222222",ordered_quantity:2,unit_cost_toman:1000,discount_toman:3000,tax_toman:0}],
}).ok,false);

for(const schema of ["PostAdminProcurementSuppliersRequest","PatchAdminProcurementSuppliersIdRequest","PostAdminProcurementPurchaseRequestsRequest","PatchAdminProcurementPurchaseRequestsIdRequest","PurchaseOrderCreateRequest","PatchAdminProcurementPurchaseOrdersIdRequest"]){
  assert.ok(generated.includes(schema+":"),"STEP70_F_GENERATED_SCHEMA:"+schema);
}
assert.ok(routes.includes('route("procurement/:view", "./routes/procurement.tsx")'),"STEP70_F_ROUTE");
for(const [surface,target] of [["AD-D-12","/procurement/suppliers"],["AD-D-13","/procurement/requests"],["AD-D-14","/procurement/orders"]]){
  assert.ok(destination.includes(`destination.surface==="${surface}"`),"STEP70_F_DEST:"+surface);
  assert.ok(destination.includes(`redirect("${target}"`),"STEP70_F_TARGET:"+surface);
}
for(const forbiddenEndpoint of ["goods-receipts","landed-costs","supplier-invoices","purchase-returns","/admin/pos/","/admin/inventory/"]){
  assert.ok(!server.includes(forbiddenEndpoint),"STEP70_F_NEGATIVE_AUTHORITY:"+forbiddenEndpoint);
}
assert.equal(packageJson.scripts["step70-procurement:verify"],"pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step70-f-procurement-admin.ts");
assert.ok((packageJson.scripts.verify??"").includes("step70-procurement:verify"),"STEP70_F_VERIFY_CHAIN");
console.log("Step 70-F Supplier / Purchase Request / Purchase Order administration verification: PASS");
