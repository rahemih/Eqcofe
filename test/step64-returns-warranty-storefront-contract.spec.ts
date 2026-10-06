import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const returnsController = readFileSync("src/modules/returns/presentation/returns.controller.ts", "utf8");
const returnsService = readFileSync("src/modules/returns/application/returns.service.ts", "utf8");
const warrantyController = readFileSync("src/modules/warranty/presentation/warranty.controller.ts", "utf8");
const warrantyService = readFileSync("src/modules/warranty/application/warranty.service.ts", "utf8");
const openapi = readFileSync("contracts/http/openapi.yaml", "utf8");
const generated = readFileSync("src/generated/openapi.ts", "utf8");
const server = readFileSync("apps/storefront/app/features/account/account-after-sales.server.ts", "utf8");
const returnsView = readFileSync("apps/storefront/app/features/account/AccountReturnsView.tsx", "utf8");
const warrantyView = readFileSync("apps/storefront/app/features/account/AccountWarrantyView.tsx", "utf8");

test("customer Returns runtime remains owner-scoped and mutations are idempotent", () => {
  assert.match(returnsController, /@CustomerOnly\(\)[\s\S]*@RequireIdempotency\('return\.customer\.create'\)[\s\S]*@Post\('customer\/orders\/:order_number\/returns'\)/);
  assert.match(returnsController, /@CustomerOnly\(\)[\s\S]*@Get\('customer\/returns'\)/);
  assert.match(returnsController, /@CustomerOnly\(\)[\s\S]*@Get\('customer\/returns\/:return_number\/timeline'\)/);
  assert.match(returnsController, /@CustomerOnly\(\)[\s\S]*@Get\('customer\/returns\/:return_number'\)/);
  assert.match(returnsController, /@RequireIdempotency\('return\.customer\.cancel'\)/);
  assert.match(returnsService, /getOwnedForReturn\(ex,orderNumber,customerId,true\)/);
  assert.match(returnsService, /if\(h\.status!=='requested'\)/);
});

test("customer Warranty runtime exposes create/read only and keeps ownership authoritative", () => {
  assert.match(warrantyController, /@CustomerOnly\(\)[\s\S]*@RequireIdempotency\('warranty\.customer\.create'\)[\s\S]*@Post\('customer\/warranty\/claims'\)/);
  assert.match(warrantyController, /@CustomerOnly\(\)[\s\S]*@Get\('customer\/warranty\/claims'\)/);
  assert.match(warrantyController, /@CustomerOnly\(\)[\s\S]*@Get\('customer\/warranty\/claims\/:claim_number\/timeline'\)/);
  assert.match(warrantyController, /@CustomerOnly\(\)[\s\S]*@Get\('customer\/warranty\/claims\/:claim_number'\)/);
  assert.match(warrantyService, /getOwnedItemForWarranty\(ex,orderItemId,customerId,true\)/);
  const customerBlock = warrantyController.slice(
    warrantyController.indexOf("@CustomerOnly()"),
    warrantyController.indexOf("@StaffOnly()"),
  );
  assert.doesNotMatch(customerBlock, /cancel|resolve|repair|approve|reject|receive|close/);
});

test("canonical OpenAPI and generated types cover exactly the Stage 64-G customer contracts", () => {
  for (const path of [
    "  /customer/orders/{order_number}/returns:",
    "  /customer/returns:",
    "  /customer/returns/{return_number}:",
    "  /customer/returns/{return_number}/timeline:",
    "  /customer/returns/{return_number}/cancel:",
    "  /customer/warranty/claims:",
    "  /customer/warranty/claims/{claim_number}:",
    "  /customer/warranty/claims/{claim_number}/timeline:",
  ]) assert.ok(openapi.includes(path), path);

  for (const operation of [
    "postCustomerOrdersOrderNumberReturns",
    "getCustomerReturns",
    "postCustomerReturnsReturnNumberCancel",
    "postCustomerWarrantyClaims",
    "getCustomerWarrantyClaims",
  ]) assert.match(generated, new RegExp(operation));

  const returnCreate = generated.slice(
    generated.indexOf("postCustomerOrdersOrderNumberReturns:"),
    generated.indexOf("getCustomerReturns:"),
  );
  const returnCancel = generated.slice(
    generated.indexOf("postCustomerReturnsReturnNumberCancel:"),
    generated.indexOf("getCustomerWarrantyClaims:"),
  );
  const warrantyCreate = generated.slice(
    generated.indexOf("postCustomerWarrantyClaims:"),
    generated.indexOf("getCustomerWarrantyClaimsClaimNumber:"),
  );
  for (const block of [returnCreate, returnCancel, warrantyCreate]) {
    assert.match(block, /"Idempotency-Key"/);
  }
});

test("Storefront rechecks return cancel authority and never invents staff after-sales actions", () => {
  const detailRead = server.indexOf('"get", "/customer/returns/{return_number}"');
  const statusCheck = server.indexOf('item.status !== "requested"', detailRead);
  const mutation = server.indexOf('"post", "/customer/returns/{return_number}/cancel"', statusCheck);
  assert.ok(detailRead >= 0 && statusCheck > detailRead && mutation > statusCheck);
  assert.match(server, /"Idempotency-Key"/);
  assert.match(server, /نتیجه عملیات .* قطعی نشد/);
  assert.doesNotMatch(server, /"\/admin\//);
  assert.doesNotMatch(server, /localStorage|sessionStorage/);
});

test("Storefront after-sales views expose bounded customer fields only", () => {
  assert.match(returnsView, /return_number/);
  assert.match(returnsView, /order_number/);
  assert.match(returnsView, /timeline\.timeline/);
  assert.match(warrantyView, /claim_number/);
  assert.match(warrantyView, /issue_type/);
  assert.match(warrantyView, /issue_description/);
  assert.match(warrantyView, /timeline\.timeline/);

  for (const forbidden of [
    "refund_amount_toman",
    "replacement_request_id",
    "inventory_movement_id",
    "warehouse_id",
    "actor_id",
  ]) {
    assert.ok(!returnsView.includes(forbidden), forbidden);
    assert.ok(!warrantyView.includes(forbidden), forbidden);
  }
});
