import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read=(path:string)=>readFile(path,"utf8");
const [
  migration,openapi,generated,cartRepo,cartService,orderService,
  checkoutReview,orderOutcome,accountOrder,packageText,
]=await Promise.all([
  read("database/migrations/0063_wholesale_checkout_customer_type_snapshot.sql"),
  read("contracts/http/openapi.yaml"),
  read("src/generated/openapi.ts"),
  read("src/modules/cart/infrastructure/cart.repository.ts"),
  read("src/modules/cart/application/cart.service.ts"),
  read("src/modules/orders/application/order.service.ts"),
  read("apps/storefront/app/features/cart-checkout/CheckoutReviewView.tsx"),
  read("apps/storefront/app/features/cart-checkout/OrderOutcomeView.tsx"),
  read("apps/storefront/app/features/account/AccountOrderDetailView.tsx"),
  read("apps/storefront/package.json"),
]);

for(const token of [
  "ADD COLUMN IF NOT EXISTS customer_type text",
  "SET customer_type = 'retail'",
  "ALTER COLUMN customer_type SET NOT NULL",
  "customer_type IN ('retail','wholesale')",
]) assert.ok(migration.includes(token),"STEP65_F_MIGRATION_MISSING:"+token);

assert.ok(!migration.includes("pricing."));
assert.ok(!migration.includes("UPDATE customer.customers"));
assert.ok(!migration.includes("customer.customers"),"STEP65_F_LEGACY_PROFILE_REDERIVATION_FORBIDDEN");
assert.ok(!migration.includes("cu.customer_type"),"STEP65_F_LEGACY_PROFILE_REDERIVATION_FORBIDDEN");
assert.ok(cartRepo.includes("customer_id,customer_type,token_hash"));
assert.ok(cartRepo.includes("${c.customerType}"));
assert.ok(cartService.includes("customerId:c.customer_id,customerType,tokenHash"));
assert.ok(orderService.includes("JOIN cart.checkouts c ON c.id=o.checkout_id"));
assert.ok(orderService.includes("c.customer_type checkout_customer_type"));
assert.ok(orderService.includes("customer_type:String(o.checkout_customer_type)"));

assert.ok(openapi.includes("customer_type:\n          type: string\n          enum:\n          - retail\n          - wholesale"));
assert.ok(generated.includes('customer_type: "retail" | "wholesale";'));

assert.ok(checkoutReview.includes('snapshot.customerType === "wholesale"'));
assert.ok(checkoutReview.includes("نوع مشتری و همه مبلغ‌ها از Quote معتبر Backend آمده‌اند"));
assert.ok(orderOutcome.includes('order.customer_type==="wholesale"'));
assert.ok(orderOutcome.includes("customer_type ذخیره‌شده در Checkout همین سفارش"));
assert.ok(accountOrder.includes('order.customer_type === "wholesale"'));
assert.ok(accountOrder.includes("زمینه عمده ذخیره‌شده در Checkout"));

const browserSources=checkoutReview+orderOutcome+accountOrder;
assert.equal(browserSources.includes("wholesale_quantity_discount_min_qty"),false);
assert.equal(browserSources.includes("discount_percent"),false);
assert.equal(/\b11\b/.test(browserSources),false,"STEP65_F_FRONTEND_THRESHOLD_FORBIDDEN");

const pkg=JSON.parse(packageText) as {scripts:Record<string,string|undefined>};
assert.equal(
  pkg.scripts["wholesale-checkout-order:verify"],
  "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step65-wholesale-checkout-order.ts",
);
const verify=pkg.scripts.verify;
if(typeof verify!=="string")throw new Error("STOREFRONT_VERIFY_CHAIN_MISSING");
for(const inherited of [
  "cart-flow:verify","checkout-fulfillment:verify","payment-outcome:verify","step63:acceptance",
  "orders-invoice-actions:verify","step64:acceptance","wholesale-commerce:verify","wholesale-checkout-order:verify",
]) assert.ok(verify.includes(inherited),"STEP65_F_VERIFY_CHAIN_MISSING:"+inherited);

console.log(JSON.stringify({
  status:"PASS",
  stage:"65-F",
  journey:"SJ-11",
  checkoutCustomerTypeSnapshot:true,
  legacyBackfillAuthority:"conservative-retail-no-profile-rederivation",
  orderCustomerTypeAuthority:"originating-checkout-snapshot",
  parallelB2BEngine:false,
  frontendThreshold:false,
  pricingRuleMutation:false,
  paymentStateMachineMutation:false,
},null,2));
