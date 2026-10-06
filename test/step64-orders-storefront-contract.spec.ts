import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const orderService=readFileSync('src/modules/orders/application/order.service.ts','utf8');
const controller=readFileSync('src/modules/orders/presentation/orders.controller.ts','utf8');
const openapi=readFileSync('contracts/http/openapi.yaml','utf8');
const generated=readFileSync('src/generated/openapi.ts','utf8');
const server=readFileSync('apps/storefront/app/features/account/account-orders.server.ts','utf8');
const listView=readFileSync('apps/storefront/app/features/account/AccountOrdersView.tsx','utf8');
const detailView=readFileSync('apps/storefront/app/features/account/AccountOrderDetailView.tsx','utf8');

test('Storefront boundary normalizes legacy customer timeline rows to canonical keys',()=>{
  const timeline=orderService.slice(
    orderService.indexOf('async timelineCustomer'),
    orderService.indexOf('async invoiceCustomer'),
  );
  assert.match(timeline,/source,to_status status/);
  assert.match(timeline,/source,status,NULL::text reason/);
  assert.match(server,/function normalizeOrderTimeline/);
  assert.match(server,/row\.to_status\) \?\? cleanTimelineString\(row\.status\)/);
  assert.match(server,/from_status: fromStatus/);
  assert.match(server,/to_status: toStatus/);
  assert.match(server,/created_at: createdAt/);
});

test('customer order runtime remains customer-owned and cancel remains idempotent',()=>{
  assert.match(controller,/@CustomerOnly\(\) @Get\('customer\/orders'\)/);
  assert.match(controller,/@CustomerOnly\(\) @Get\('customer\/orders\/:order_number'\)/);
  assert.match(controller,/@CustomerOnly\(\) @Get\('customer\/orders\/:order_number\/timeline'\)/);
  assert.match(controller,/@CustomerOnly\(\) @Get\('customer\/orders\/:order_number\/invoice'\)/);
  assert.match(controller,/@RequireIdempotency\('customer\.order\.cancel'\)/);
  assert.match(orderService,/status==='pending_confirmation'\?\['cancel_order'\]:\[\]/);
  assert.match(orderService,/o\.status!=='pending_confirmation'/);
});

test('canonical OpenAPI and generated types expose only supported Stage 64-E order operations',()=>{
  const orders=openapi.slice(
    openapi.indexOf('  /customer/orders:'),
    openapi.indexOf('  /orders/{order_number}/payments/{payment_id}:'),
  );
  for(const capability of [
    '/customer/orders:',
    '/customer/orders/{order_number}:',
    '/customer/orders/{order_number}/timeline:',
    '/customer/orders/{order_number}/invoice:',
    '/customer/orders/{order_number}/cancel:',
  ]) assert.ok(orders.includes(capability),capability);
  assert.match(orders,/IdempotencyKey/);
  assert.match(orders,/OrderTimelineResponse/);
  assert.match(orders,/OrderInvoiceResponse/);
  assert.match(orders,/CancelOrderRequest/);
  assert.match(orders,/CancelOrderResult/);

  for(const operation of [
    'listCustomerOrders',
    'getCustomerOrdersOrderNumber',
    'getCustomerOrdersOrderNumberTimeline',
    'getCustomerOrdersOrderNumberInvoice',
    'postCustomerOrdersOrderNumberCancel',
  ]) assert.match(generated,new RegExp(operation));
});

test('Storefront order list does not invent filtering and detail cancellation rechecks authority',()=>{
  assert.match(server,/const PAGE_SIZE = 12/);
  const listStart=server.indexOf('client.request("get", "/customer/orders", {');
  const listEnd=server.indexOf('const typed = response.data',listStart);
  assert.ok(listStart>=0&&listEnd>listStart);
  const listRequest=server.slice(listStart,listEnd);
  assert.match(listRequest,/query: \{[\s\S]*limit: PAGE_SIZE,[\s\S]*cursor/);
  assert.doesNotMatch(listRequest,/\b(?:status|filter|sort)\s*:/);
  assert.match(server,/client\.request\("get", "\/customer\/orders\/{order_number}"/);
  assert.match(server,/allowed_actions\.includes\("cancel_order"\)/);
  assert.match(server,/"Idempotency-Key"/);
  assert.match(server,/نتیجه عملیات قطعی نشد/);
  assert.doesNotMatch(server,/localStorage|sessionStorage/);
});

test('Storefront order surfaces preserve Toman, bidi and bounded authoritative actions',()=>{
  assert.match(listView,/toLocaleString\("fa-IR"\)/);
  assert.match(listView,/تومان/);
  assert.match(listView,/bdi/);
  assert.doesNotMatch(listView,/status-filter|filter-status|name="status"/);
  assert.match(detailView,/allowed_actions\.includes\("cancel_order"\)/);
  assert.match(detailView,/name="intent" value="cancel-order"/);
  assert.match(detailView,/فایل PDF جداگانه‌ای تعریف نشده است/);
  assert.match(detailView,/bdi/);
});
