import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type InventoryAdjustmentBody=ApiComponents["schemas"]["InventoryAdjustmentRequest"];
export type WarehouseProtectionBody=ApiComponents["schemas"]["WarehouseProtectionRequest"];
type FieldError=ApiComponents["schemas"]["FieldError"];

export const INVENTORY_ADJUSTMENT_TYPES=[
  "count_correction",
  "receipt_adjustment",
  "manual",
  "damage",
  "quarantine",
  "quarantine_release",
  "damaged_disposal",
] as const;
export type InventoryAdjustmentType=(typeof INVENTORY_ADJUSTMENT_TYPES)[number];

export type InventoryProbe=
  | "overview"
  | "warehouses"
  | "variant"
  | "movements"
  | "cost-basis"
  | "cost-layers";

export type InventoryProbeResult=
  | {kind:"ready";endpoint:string;status:number;requestId:string|null;setCookies:readonly string[]}
  | {kind:"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};

export type InventoryMutationFailure=
  | {kind:"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";requestId:string|null;setCookies:readonly string[]}
  | {kind:"invalid";requestId:string|null;fieldErrors:readonly FieldError[];setCookies:readonly string[]};

export type InventoryAdjustmentResult=
  | {kind:"confirmed";requestId:string|null;idempotencyKey:string;setCookies:readonly string[]}
  | (InventoryMutationFailure&{idempotencyKey?:string});

export type WarehouseProtectionResult=
  | {kind:"confirmed";requestId:string|null;setCookies:readonly string[]}
  | InventoryMutationFailure;

export function validateInventoryAdjustment(input:{
  warehouseId:string;
  variantId:string;
  quantityDelta:number;
  adjustmentType:string;
  reason:string;
  unitCostToman:number|null;
}):{ok:true;body:InventoryAdjustmentBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  const type=input.adjustmentType as InventoryAdjustmentType;
  const reason=input.reason.trim();
  if(!isUuid(input.warehouseId))errors.push(field("warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار باید UUID معتبر باشد."));
  if(!isUuid(input.variantId))errors.push(field("variant_id","INVALID_VARIANT_ID","شناسهٔ واریانت باید UUID معتبر باشد."));
  if(!Number.isSafeInteger(input.quantityDelta)||input.quantityDelta===0)errors.push(field("quantity_delta","INVALID_QUANTITY","تغییر موجودی باید عدد صحیح غیرصفر باشد."));
  if(!(INVENTORY_ADJUSTMENT_TYPES as readonly string[]).includes(type))errors.push(field("adjustment_type","INVALID_ADJUSTMENT_TYPE","نوع اصلاح موجودی معتبر نیست."));
  if(reason.length<2)errors.push(field("reason","INVALID_REASON","دلیل اصلاح موجودی باید حداقل دو نویسه داشته باشد."));
  if(input.unitCostToman!==null&&(!Number.isSafeInteger(input.unitCostToman)||input.unitCostToman<0))errors.push(field("unit_cost_toman","INVALID_MONEY","بهای واحد باید عدد صحیح نامنفی به تومان باشد."));
  const ordinaryIncrease=type==="count_correction"||type==="receipt_adjustment"||type==="manual";
  if(ordinaryIncrease&&input.quantityDelta>0&&input.unitCostToman===null)errors.push(field("unit_cost_toman","COST_BASIS_REQUIRED","برای افزایش موجودی از این نوع، بهای واحد به تومان الزامی است."));
  if(errors.length)return{ok:false,fieldErrors:Object.freeze(errors)};
  return{
    ok:true,
    body:{
      warehouse_id:input.warehouseId,
      variant_id:input.variantId,
      quantity_delta:input.quantityDelta,
      adjustment_type:type,
      reason,
      ...(input.unitCostToman===null?{}:{unit_cost_toman:input.unitCostToman}),
    },
  };
}

export function validateWarehouseProtection(input:{
  warehouseId:string;
  expectedVersion:number;
  percent:number;
}):{ok:true;warehouseId:string;version:number;body:WarehouseProtectionBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  if(!isUuid(input.warehouseId))errors.push(field("warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار باید UUID معتبر باشد."));
  if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)errors.push(field("expected_version","INVALID_VERSION","نسخهٔ فعلی انبار باید عدد صحیح مثبت باشد."));
  if(!Number.isFinite(input.percent)||input.percent<0||input.percent>100)errors.push(field("physical_protection_percent","INVALID_PERCENT","درصد محافظت باید بین صفر تا صد باشد."));
  if(errors.length)return{ok:false,fieldErrors:Object.freeze(errors)};
  return{ok:true,warehouseId:input.warehouseId,version:input.expectedVersion,body:{physical_protection_percent:input.percent}};
}

export async function probeInventory(
  request:Pick<Request,"headers">,
  probe:InventoryProbe,
  variantId:string|null,
):Promise<InventoryProbeResult>{
  if(["variant","movements","cost-basis","cost-layers"].includes(probe)&&!variantId){
    return{kind:"not_found",requestId:null,setCookies:[]};
  }
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=probe==="overview"
      ?await bridge.client.request("get","/admin/inventory",{})
      :probe==="warehouses"
        ?await bridge.client.request("get","/admin/inventory/warehouses",{})
        :probe==="variant"
          ?await bridge.client.request("get","/admin/inventory/{variant_id}",{pathParams:{variant_id:variantId!}})
          :probe==="movements"
            ?await bridge.client.request("get","/admin/inventory/{variant_id}/movements",{pathParams:{variant_id:variantId!}})
            :probe==="cost-basis"
              ?await bridge.client.request("get","/admin/inventory/{variant_id}/cost-basis",{pathParams:{variant_id:variantId!}})
              :await bridge.client.request("get","/admin/inventory/{variant_id}/cost-layers",{pathParams:{variant_id:variantId!}});
    return{
      kind:"ready",
      endpoint:inventoryProbeEndpoint(probe,variantId),
      status:response.status,
      requestId:response.requestId,
      setCookies:bridge.takeSetCookies(),
    };
  }catch(error){
    return classifyRead(error,bridge?.takeSetCookies()??[]);
  }
}

export async function submitInventoryAdjustment(
  request:Pick<Request,"headers">,
  stepUpToken:string,
  body:InventoryAdjustmentBody,
):Promise<InventoryAdjustmentResult>{
  const idempotencyKey=randomUUID();
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/inventory/adjustments",{
      headers:{"Idempotency-Key":idempotencyKey},
      body,
    });
    return{kind:"confirmed",requestId:response.requestId,idempotencyKey,setCookies:bridge.takeSetCookies()};
  }catch(error){
    const failure=classifyMutation(error,bridge?.takeSetCookies()??[]);
    return{...failure,idempotencyKey};
  }
}

export async function updateWarehouseProtection(
  request:Pick<Request,"headers">,
  warehouseId:string,
  expectedVersion:number,
  body:WarehouseProtectionBody,
):Promise<WarehouseProtectionResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("patch","/admin/inventory/warehouses/{id}/protection",{
      pathParams:{id:warehouseId},
      headers:{"If-Match":formatInventoryIfMatch(expectedVersion)},
      body,
    });
    return{kind:"confirmed",requestId:response.requestId,setCookies:bridge.takeSetCookies()};
  }catch(error){
    return classifyMutation(error,bridge?.takeSetCookies()??[]);
  }
}

export function formatInventoryIfMatch(version:number):string{
  if(!Number.isSafeInteger(version)||version<1)throw new Error("INVENTORY_VERSION_INVALID");
  return `"${version}"`;
}

function inventoryProbeEndpoint(probe:InventoryProbe,variantId:string|null):string{
  if(probe==="overview")return"/admin/inventory";
  if(probe==="warehouses")return"/admin/inventory/warehouses";
  if(probe==="variant")return`/admin/inventory/${variantId}`;
  if(probe==="movements")return`/admin/inventory/${variantId}/movements`;
  if(probe==="cost-basis")return`/admin/inventory/${variantId}/cost-basis`;
  return`/admin/inventory/${variantId}/cost-layers`;
}

function classifyRead(error:unknown,setCookies:readonly string[]):InventoryProbeResult{
  if(error instanceof ApiClientError&&error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error instanceof ApiClientError?error.requestId:null,setCookies};
}

function classifyMutation(error:unknown,setCookies:readonly string[]):InventoryMutationFailure{
  if(!(error instanceof ApiClientError))return{kind:"unknown_outcome",requestId:null,setCookies};
  if(error.kind==="network"||error.kind==="timeout"||error.kind==="aborted")return{kind:"unknown_outcome",requestId:error.requestId,setCookies};
  if(error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
    if(error.status===409||error.status===412||error.status===428)return{kind:"conflict",requestId:error.requestId,setCookies};
    if(error.status===400||error.status===422)return{kind:"invalid",requestId:error.requestId,fieldErrors:Object.freeze([...error.fieldErrors]),setCookies};
    if(error.status===408||(typeof error.status==="number"&&error.status>=500))return{kind:"unknown_outcome",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error.requestId,setCookies};
}

function isUuid(value:string):boolean{return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function field(fieldName:string,code:string,message:string):FieldError{return{field:fieldName,code,message};}
