import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync("database/migrations/0063_wholesale_checkout_customer_type_snapshot.sql","utf8");
const cartRepo=readFileSync("src/modules/cart/infrastructure/cart.repository.ts","utf8");
const cartService=readFileSync("src/modules/cart/application/cart.service.ts","utf8");
const orderService=readFileSync("src/modules/orders/application/order.service.ts","utf8");
const openapi=readFileSync("contracts/http/openapi.yaml","utf8");

test("Step65-F stores quote customer type on the existing checkout snapshot",()=>{
  assert.match(migration,/ADD COLUMN IF NOT EXISTS customer_type text/);
  assert.match(migration,/SET customer_type = 'retail'/);
  assert.match(migration,/CHECK \(customer_type IN \('retail','wholesale'\)\)/);
  assert.equal(migration.includes("customer.customers"),false);
  assert.equal(migration.includes("cu.customer_type"),false);
  assert.match(cartRepo,/customer_id,customer_type,token_hash/);
  assert.match(cartRepo,/\$\{c\.customerType\}/);
  assert.match(cartService,/customerId:c\.customer_id,customerType,tokenHash/);
});

test("Step65-F OrderResponse reads immutable customer type from originating checkout",()=>{
  assert.match(orderService,/JOIN cart\.checkouts c ON c\.id=o\.checkout_id/);
  assert.match(orderService,/c\.customer_type checkout_customer_type/);
  assert.match(orderService,/customer_type:String\(o\.checkout_customer_type\)/);
  assert.match(openapi,/customer_type:\n\s+type: string\n\s+enum:\n\s+- retail\n\s+- wholesale/);
});

test("Step65-F does not mutate pricing, customer promotion, inventory or payment rules",()=>{
  assert.equal(migration.includes("pricing."),false);
  assert.equal(migration.includes("inventory."),false);
  assert.equal(migration.includes("payments."),false);
  assert.equal(migration.includes("UPDATE customer.customers"),false);
  assert.equal(cartService.includes("wholesale_quantity_discount_min_qty"),false);
});
