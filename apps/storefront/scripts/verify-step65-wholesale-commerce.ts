import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read=(path:string)=>readFile(path,"utf8");

const [
  openapi,
  generated,
  cartService,
  cartView,
  productContract,
  productData,
  productExperience,
  productAdd,
  productCartServer,
  productRoute,
  cartCss,
  productCss,
  packageText,
  catalogQuery,
]=await Promise.all([
  read("contracts/http/openapi.yaml"),
  read("src/generated/openapi.ts"),
  read("src/modules/cart/application/cart.service.ts"),
  read("apps/storefront/app/features/cart-checkout/CartView.tsx"),
  read("apps/storefront/app/features/product-detail/product-detail-contract.ts"),
  read("apps/storefront/app/features/product-detail/product-detail-data.server.ts"),
  read("apps/storefront/app/features/product-detail/ProductDetailExperience.tsx"),
  read("apps/storefront/app/features/product-detail/ProductAddToCart.tsx"),
  read("apps/storefront/app/features/product-detail/product-detail-cart.server.ts"),
  read("apps/storefront/app/routes/product.tsx"),
  read("apps/storefront/app/styles/cart.css"),
  read("apps/storefront/app/styles/product-detail.css"),
  read("apps/storefront/package.json"),
  read("src/modules/catalog/application/catalog-query.service.ts"),
]);

for(const token of [
  "CartPricingView:",
  "CartLinePricingView:",
  "- customer_type",
  "- pricing",
  "- requires_revalidation",
  "- price",
  "- availability",
]){
  assert.ok(openapi.includes(token), "STEP65_E_OPENAPI_CART_CONTEXT_MISSING:"+token);
}
for(const token of [
  "CartPricingView: {",
  "CartLinePricingView: {",
  'customer_type: "retail" | "wholesale"',
  'pricing: components["schemas"]["CartPricingView"] | null',
  "requires_revalidation: boolean",
  'price: components["schemas"]["CartLinePricingView"] | null',
  'availability: components["schemas"]["AvailabilityView"]',
]){
  assert.ok(generated.includes(token), "STEP65_E_GENERATED_CART_CONTEXT_MISSING:"+token);
}

for(const token of [
  "customerCommerce.getCustomerType(customerId)",
  "pricing.quoteVariant({variantId:String(i.variant_id),quantity,customerType})",
  "getOnlineSellableQuantity(String(i.variant_id))",
  "unit_base_toman",
  "unit_final_toman",
  "discount_toman",
  "line_total_toman",
  "pricingComplete?{subtotal_toman",
  "requires_revalidation:requiresRevalidation",
]){
  assert.ok(cartService.includes(token), "STEP65_E_CART_AUTHORITY_MISSING:"+token);
}
assert.ok(cartService.includes("price=null"));
assert.ok(cartService.includes("pricingComplete=false"));
assert.ok(cartService.includes("MoneyToman.from"));
assert.ok(!cartService.includes("wholesale_quantity_discount_min_qty"));

assert.ok(productContract.includes('ApiSuccessData<"get", "/customer/profile">'));
assert.ok(productData.includes('bridge.client.request("get", "/customer/profile"'));
assert.ok(productData.includes("customerType = profileResult.data.customer_type"));
assert.ok(productExperience.includes("customerType={customerType}"));
assert.ok(productAdd.includes('data-wholesale-context={wholesale || undefined}'));
assert.ok(productAdd.includes('name="quantity"'));
assert.ok(productAdd.includes("min={1}"));
assert.ok(productAdd.includes("max={999}"));
assert.ok(productAdd.includes("قیمت نمایش‌داده‌شده در بخش مدل، قیمت کاتالوگ است"));
assert.ok(productAdd.includes("هیچ حداقل یا درصد تخفیفی در مرورگر ثابت نشده است"));
assert.ok(!productAdd.includes("11"));
assert.ok(!productAdd.includes("discount_percent"));

for(const token of [
  "extractCustomerSessionCookieHeader",
  'profile.data.customer_type !== "wholesale"',
  '"/customer/cart/merge"',
  '"/customer/cart/access"',
  "serializeCartCredentials",
  "customerSessionSetCookies",
  "quantityOrOptions",
]){
  assert.ok(productCartServer.includes(token), "STEP65_E_PRODUCT_CART_BRIDGE_MISSING:"+token);
}
assert.ok(productCartServer.includes("quantity < 1 || quantity > 999"));
assert.ok(productRoute.includes("appendCustomerSessionSetCookies(headers, result.customerSessionSetCookies)"));
assert.ok(productRoute.includes("addProductVariantToCart(request, variantId, quantity)"));
assert.ok(productRoute.includes("customerType={loaderData.customerType}"));

for(const token of [
  'cart.customer_type === "wholesale"',
  "item.price.unit_final_toman",
  "item.price.unit_base_toman",
  "item.price.discount_toman",
  "item.price.line_total_toman",
  "cart.pricing.subtotal_toman",
  "cart.pricing.discount_toman",
  "cart.pricing.total_toman",
  "cart.requires_revalidation",
  "به‌روزرسانی و محاسبه دوباره",
  "هیچ حداقل یا درصد تخفیفی در مرورگر ثابت نشده است",
]){
  assert.ok(cartView.includes(token), "STEP65_E_CART_UX_MISSING:"+token);
}
assert.ok(!cartView.includes("discount_percent"));
assert.ok(!cartView.includes("wholesale_quantity_discount_min_qty"));

assert.ok(catalogQuery.includes("getVariantPrice(variant.id)"));
assert.ok(!catalogQuery.includes("getVariantPrice(variant.id,quantity"));
assert.ok(!catalogQuery.includes("getVariantPrice(variant.id, quantity"));
assert.ok(cartCss.includes(".cart-wholesale-context"));
assert.ok(productCss.includes(".product-cart__wholesale-context"));
assert.equal(/\bbrown\b/i.test(cartCss+productCss),false,"STEP65_E_BROWN_FORBIDDEN");

const pkg=JSON.parse(packageText) as {scripts:Record<string,string|undefined>};
assert.equal(
  pkg.scripts["wholesale-commerce:verify"],
  "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step65-wholesale-commerce.ts",
);
const verify=pkg.scripts.verify;
if(typeof verify!=="string")throw new Error("STOREFRONT_VERIFY_CHAIN_MISSING");
for(const inherited of [
  "product-detail-hardening:verify",
  "cart-flow:verify",
  "step63:acceptance",
  "wholesale-foundation:verify",
  "wholesale-application:verify",
  "api:verify",
  "auth:verify",
  "state:verify",
  "quality:static",
  "wholesale-commerce:verify",
]){
  assert.ok(verify.includes(inherited),"STEP65_E_VERIFY_CHAIN_MISSING:"+inherited);
}

console.log(JSON.stringify({
  status:"PASS",
  stage:"65-E",
  screen:"SF-E-10",
  productCatalogWholesaleRelabel:false,
  cartCustomerTypeAuthority:"CustomerCommercePort",
  cartPricingAuthority:"PricingQuotePort(quantity+customerType)",
  cartAvailabilityAuthority:"InventoryAvailabilityPort",
  wholesaleThresholdInBrowser:false,
  parallelB2BCart:false,
},null,2));
