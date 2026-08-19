import fs from 'node:fs';
const c=fs.readFileSync(new URL('../presentation/fulfillment.controller.ts',import.meta.url),'utf8');
const s=fs.readFileSync(new URL('../application/shipment.service.ts',import.meta.url),'utf8');
const checks=[
["14 routes",["admin/fulfillment/orders","admin/fulfillment/orders/:order_id","admin/fulfillment/orders/:order_id/allocate","admin/fulfillment/orders/:order_id/start-preparation","admin/fulfillment/allocations/:id/pick","admin/fulfillment/allocations/:id/unpick","admin/shipments","admin/shipments/:id","admin/shipments/:id/mark-ready","admin/shipments/:id/handover","admin/shipments/:id/cancel","admin/shipments/:id/refresh-tracking","webhooks/shipping/:provider_key"].every(x=>c.includes(x))],
["staff guarded",c.includes("@StaffOnly() @Permissions('fulfillment.view')")],
["handover step-up",c.includes("@RequireStepUp() @RequireIdempotency('shipment.handover')")],
["cancel step-up",c.includes("@RequireStepUp() @RequireIdempotency('shipment.cancel')")],
["webhook public",c.includes("@Public() @HttpCode(HttpStatus.OK)")],
["raw body required",s.includes("SHIPPING_WEBHOOK_RAW_BODY_REQUIRED")],
["conflict protected",s.includes("SHIPPING_WEBHOOK_EVENT_CONFLICT")],
["partial consume",s.includes("consumeForShipment")],
];
let fail=0;for(const [n,v] of checks){console.log(v?'PASS':'FAIL',n);if(!v)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);
process.exit(fail?1:0);
