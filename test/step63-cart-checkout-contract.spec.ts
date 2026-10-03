import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const openapi = readFileSync('contracts/http/openapi.yaml','utf8');
const generated = readFileSync('src/generated/openapi.ts','utf8');
const cartController = readFileSync('src/modules/cart/presentation/cart.controller.ts','utf8');
const cartService = readFileSync('src/modules/cart/application/cart.service.ts','utf8');
const customerController = readFileSync('src/modules/customer/presentation/customer.controller.ts','utf8');
const addressService = readFileSync('src/modules/customer/application/customer-address.service.ts','utf8');
const orderController = readFileSync('src/modules/orders/presentation/orders.controller.ts','utf8');
const paymentController = readFileSync('src/modules/payments/presentation/payments.controller.ts','utf8');
const paymentService = readFileSync('src/modules/payments/application/payment.service.ts','utf8');

test('checkout quote runtime remains authoritative and OpenAPI exposes coupon and typed pricing snapshots',()=>{
  assert.match(cartController,/@RequireIdempotency\('checkout\.quote'\)/);
  assert.match(cartService,/input:\{shipping_method_id:string;coupon_code\?:string\|null\}/);
  assert.match(cartService,/checkoutPromotions\.evaluate\(\{couponCode:input\.coupon_code/);
  assert.match(cartService,/pricing_discount_toman:pricingDiscount\.toJSON\(\)/);
  assert.match(cartService,/marketing_discount_toman:marketingDiscount\.toJSON\(\)/);
  assert.match(cartService,/marketing_snapshot:\{applications:marketing\.applications,pricing_net_toman:pricingNet\.toJSON\(\)\}/);

  const quote = openapi.slice(openapi.indexOf('  /cart/{id}/quote:'), openapi.indexOf('  /checkout/{id}/reserve:'));
  assert.match(quote,/coupon_code:/);
  assert.match(quote,/x-eqcofe:\s*\n\s*idempotency: required/s);
  assert.match(quote,/CheckoutQuoteResponse/);

  const schema = openapi.slice(openapi.indexOf('    CheckoutQuoteLine:'), openapi.indexOf('    CreateReservationRequest:'));
  for(const name of ['CheckoutQuoteLine','CheckoutMarketingSnapshot','customer_type','pricing_discount_toman','marketing_discount_toman','marketing_snapshot']){
    assert.match(schema,new RegExp(name));
  }
  assert.match(schema,/items:\s*\n\s*type: array\s*\n\s*items:\s*\n\s*\$ref: '#\/components\/schemas\/CheckoutQuoteLine'/s);
});

test('customer address contract matches customer-owned runtime status, fields and idempotency',()=>{
  assert.match(customerController,/@CustomerOnly\(\) @Get\('customer\/addresses'\)/);
  assert.match(customerController,/@RequireIdempotency\('customer\.address\.create'\) @Post\('customer\/addresses'\)/);
  assert.match(customerController,/@RequireIdempotency\('customer\.address\.update'\) @Patch\('customer\/addresses\/:id'\)/);
  assert.match(customerController,/@RequireIdempotency\('customer\.address\.set_default'\)/);
  assert.match(customerController,/@HttpCode\(HttpStatus\.OK\) @Post\('customer\/addresses\/:id\/set-default'\)/);
  assert.match(customerController,/@RequireIdempotency\('customer\.address\.delete'\)/);
  assert.match(customerController,/@HttpCode\(HttpStatus\.NO_CONTENT\) @Delete\('customer\/addresses\/:id'\)/);

  assert.match(addressService,/isDefault:this\.bool\(input\.is_default\)/);
  assert.match(addressService,/locationMetadata:this\.metadata\(input\.location_metadata\)/);
  assert.match(addressService,/is_default:Boolean\(row\.is_default_shipping\)/);

  const addresses = openapi.slice(openapi.indexOf('  /customer/addresses:'), openapi.indexOf('  /customer/orders/{order_number}:'));
  assert.match(addresses,/CustomerAddressResponse/);
  assert.match(addresses,/'201':/);
  assert.match(addresses,/'204':/);
  assert.doesNotMatch(addresses,/'202':/);
  assert.match(addresses,/IdempotencyKey/);

  const schemas = openapi.slice(openapi.indexOf('    CustomerAddressResponse:'), openapi.indexOf('    PostWebhooksPaymentsProviderKeyRequest:'));
  assert.match(schemas,/location_metadata:/);
  assert.match(schemas,/is_default:/);
  const patch = schemas.slice(schemas.indexOf('    PatchCustomerAddressesIdRequest:'),schemas.indexOf('    PostCustomerAddressesIdSetDefaultRequest:'));
  assert.doesNotMatch(patch,/is_default_shipping:/);
  assert.doesNotMatch(patch,/is_default:/);
});

test('reserve order and payment recovery boundaries remain fail-closed and idempotent',()=>{
  assert.match(cartController,/@RequireIdempotency\('checkout\.reserve'\)/);
  assert.match(cartService,/CART_CHANGED_SINCE_QUOTE/);
  assert.match(cartService,/SHIPPING_METHOD_UNAVAILABLE/);
  assert.match(orderController,/@RequireIdempotency\('order\.create'\) @Post\('checkout\/:id\/order'\)/);
  assert.match(paymentController,/@RequireIdempotency\('payment\.initiate\.guest'\)/);
  assert.match(paymentController,/@Post\('payments\/:payment_id\/verify'\)/);
  assert.match(paymentController,/@Get\('payments\/:payment_id\/status'\)/);
  assert.match(paymentService,/PAYMENT_OUTCOME_UNKNOWN/);
  assert.match(paymentService,/reconciliation_required/);
  assert.match(paymentService,/await this\.checkProvider\(id,'verify'\)/);
});

test('generated OpenAPI contains Step 63-B typed quote and address contracts',()=>{
  for(const name of ['CheckoutQuoteLine','CheckoutMarketingSnapshot','CustomerAddressResponse']){
    assert.match(generated,new RegExp(name));
  }
  assert.match(generated,/coupon_code\?: string \| null/);
  assert.match(generated,/customer_type: "retail" \| "wholesale"/);
  assert.match(generated,/items: components\["schemas"\]\["CheckoutQuoteLine"\]\[\]/);
  assert.match(generated,/data: components\["schemas"\]\["CustomerAddressResponse"\]\[\]/);
  assert.match(generated,/201: \{/);
});

test('generated contract is byte-for-byte reproducible from canonical OpenAPI',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step63-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    assert.equal(readFileSync('src/generated/openapi.ts','utf8'),readFileSync(output,'utf8'));
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});
