import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateReceiptCreate, validateReceiptUpdate, validateLandedCreate,
  validateInvoiceCreate, validateReturnCreate,
} from "../app/operations/procurement-settlement.server.js";

const repo=resolve(fileURLToPath(new URL("../..",import.meta.url)),"..");
const read=(path:string)=>readFileSync(resolve(repo,path),"utf8");
const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP70-G-RECEIPT-LANDED-INVOICE-RETURN-ADMIN-001.json"));
const server=read("apps/admin/app/operations/procurement-settlement.server.ts");
const route=read("apps/admin/app/routes/procurement-settlement.tsx");
const routing=read("apps/admin/app/routes.ts");
const destination=read("apps/admin/app/routes/destination.tsx");
const controller=read("src/modules/procurement/presentation/procurement.controller.ts");
const verifyScript=JSON.parse(read("apps/admin/package.json")).scripts;
const uuid=(id:number)=>`${String(id).repeat(8)}-${String(id).repeat(4)}-4${String(id).repeat(3)}-8${String(id).repeat(3)}-${String(id).repeat(12)}`;

assert.equal(task.risk,"HIGH");
assert.equal(task.human_gate_required,true);
assert.equal(task.canonical.base_sha,"946ccb63ed210305b0ced2fb12143944ff37b796");
assert.deepEqual(task.evidence.surfaces,["AD-D-15","AD-D-16","AD-D-17","AD-D-18"]);
assert.equal(task.evidence.operation_count,23);
assert.ok(task.scope.forbidden.includes("src/modules/procurement/**"));
assert.ok(!task.scope.write.includes("src/modules/procurement/presentation/procurement.controller.ts"));
for(const forbidden of ["docs/13-product-design/**","contracts/**","src/generated/**","apps/storefront/**",".github/**"]){
  assert.ok(task.scope.forbidden.includes(forbidden),`FORBIDDEN:${forbidden}`);
}
assert.ok(server.includes("createAdminAuthBridge(request"));
assert.ok(server.includes("randomUUID()"));
assert.ok(server.includes("Idempotency-Key"));
assert.ok(server.includes('"If-Match"'));
assert.ok(!route.includes('"Idempotency-Key"')&&!route.includes('name="Idempotency-Key"'));
assert.ok(route.includes('runAdminWebAuthn("authentication"')&&route.includes("verifyAdminStepUp"));
assert.ok(route.includes("هیچ retry خودکاری"));
assert.ok(!route.includes('transition==="reverse"')&&!route.includes('transition==="finalize"')&&!route.includes('transition==="dispute"'));
assert.ok(!route.includes('transition==="cancel"'));
assert.ok(routing.includes('route("procurement-settlement/:view", "./routes/procurement-settlement.tsx")'));
for(const [surface,path] of [
  ["AD-D-15","/procurement-settlement/receipts"],["AD-D-16","/procurement-settlement/landed-costs"],
  ["AD-D-17","/procurement-settlement/invoices"],["AD-D-18","/procurement-settlement/returns"]
])assert.ok(destination.includes(`destination.surface==="${surface}"`)&&destination.includes(`redirect("${path}"`),`DEST:${surface}`);
for(const [name,guard] of [
  ["receipt.post","@RequireIdempotency('procurement.receipt.post')"],
  ["receipt.reverse","@RequireIdempotency('procurement.receipt.reverse')"],
  ["landed.finalize","@RequireIdempotency('procurement.landed_cost.finalize')"],
  ["return.ship","@RequireIdempotency('procurement.return.ship')"]
] as const)assert.ok(controller.includes(guard),`GUARD:${name}`);
assert.ok(verifyScript["step70-settlement:verify"]?.includes("verify-step70-g-settlement-admin.ts"));
assert.ok(String(verifyScript.verify??"").includes("step70-settlement:verify"));

const item={variant_id:uuid(3),received_quantity:4,accepted_quantity:2,quarantine_quantity:1,rejected_quantity:1,unit_cost_toman:1400};
const receipt={supplier_id:uuid(1),warehouse_id:uuid(2),items:[item]};
assert.equal(validateReceiptCreate(receipt).ok,true);
assert.equal(validateReceiptCreate({...receipt,items:[{...item,rejected_quantity:0}]}).ok,false);
assert.equal(validateReceiptCreate({...receipt,items:[item,item]}).ok,false);
assert.equal(validateReceiptCreate({...receipt,items:[{...item,unit_cost_toman:1.2}]}).ok,false);
assert.equal(validateReceiptUpdate({items:[item]}).ok,true);
assert.equal(validateReceiptUpdate({}).ok,false);
assert.equal(validateLandedCreate({goods_receipt_id:uuid(4),cost_type:"shipping",allocation_method:"quantity",amount_toman:1400}).ok,true);
assert.equal(validateLandedCreate({goods_receipt_id:uuid(4),cost_type:"shipping",allocation_method:"weight",amount_toman:1400}).ok,false);
assert.equal(validateLandedCreate({goods_receipt_id:uuid(4),cost_type:"shipping",allocation_method:"quantity",amount_toman:-2}).ok,false);
const invoice={supplier_id:uuid(1),invoice_number:"A-1",invoice_date:"2026-10-28",amount_toman:200};
assert.equal(validateInvoiceCreate(invoice).ok,true);
assert.equal(validateInvoiceCreate({...invoice,invoice_number:""}).ok,false);
const returnItem={variant_id:uuid(3),quantity:2,stock_bucket:"quarantine" as const};
const ret={supplier_id:uuid(1),warehouse_id:uuid(2),reason:"return",items:[returnItem]};
assert.equal(validateReturnCreate(ret).ok,true);
assert.equal(validateReturnCreate({...ret,items:[returnItem,returnItem]}).ok,false);
assert.equal(validateReturnCreate({...ret,items:[{...returnItem,quantity:0}]}).ok,false);

console.log("Step 70-G bounded settlement administration verifier PASS");
