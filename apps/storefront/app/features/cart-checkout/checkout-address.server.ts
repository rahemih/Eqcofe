import { ApiClientError } from "../../platform/api/errors.js";
import type { CustomerAddressUpdateBody, CustomerAddressesResponse } from "./cart-checkout-contract.js";
import { loadCustomerAddresses, updateCustomerAddress } from "./cart-checkout-data.server.js";
import { readSelectedAddressId, serializeSelectedAddressId, stableCustomerIdempotencyKey } from "./checkout-flow-state.server.js";

export const ADDRESS_REFERENCE_DATA_BLOCKER = "ADDRESS_REFERENCE_DATA_MISSING";
export type CheckoutAddress = CustomerAddressesResponse["data"][number];
export type CheckoutAddressLoaderData = { addresses: CheckoutAddress[]; selectedAddressId: string | null; createAddressAvailable: false; blockerCode: typeof ADDRESS_REFERENCE_DATA_BLOCKER };
export type CheckoutAddressActionResult =
  | { kind:"redirect"; location:"/checkout/delivery"; setCookies:readonly string[] }
  | { kind:"data"; statusCode:number; message:string; requestId:string|null };

export async function loadCheckoutAddress(request: Request): Promise<{data:CheckoutAddressLoaderData;setCookies:readonly string[]}> {
  const result=await loadCustomerAddresses(request);
  return {data:{addresses:result.data.data,selectedAddressId:readSelectedAddressId(request),createAddressAvailable:false,blockerCode:ADDRESS_REFERENCE_DATA_BLOCKER},setCookies:result.setCookies};
}

export async function handleCheckoutAddressAction(request: Request): Promise<CheckoutAddressActionResult> {
  const form=await request.formData();
  const intent=String(form.get("intent")??"");
  if(intent==="create-address") return {kind:"data",statusCode:409,message:"ثبت نشانی جدید تا فراهم‌شدن مرجع معتبر استان و شهر فعال نمی‌شود؛ شناسه ساختگی تولید نخواهد شد.",requestId:null};
  const addressId=String(form.get("address_id")??"");
  if(!UUID_RE.test(addressId)) return invalid("نشانی انتخاب‌شده معتبر نیست.");
  try{
    const listed=await loadCustomerAddresses(request);
    const current=listed.data.data.find(item=>item.id===addressId);
    if(!current) return invalid("نشانی انتخاب‌شده متعلق به حساب فعلی نیست یا دیگر وجود ندارد.",404);
    if(intent==="select-address") return {kind:"redirect",location:"/checkout/delivery",setCookies:[...listed.setCookies,serializeSelectedAddressId(request,addressId)]};
    if(intent==="update-address"){
      const body=parseAddressPatch(form);
      if(!body) return invalid("اطلاعات ویرایش نشانی معتبر نیست.");
      const updated=await updateCustomerAddress(request,addressId,body,stableCustomerIdempotencyKey(request,"checkout-address-update",JSON.stringify({addressId,body})));
      return {kind:"redirect",location:"/checkout/delivery",setCookies:[...listed.setCookies,...updated.setCookies,serializeSelectedAddressId(request,addressId)]};
    }
    return invalid("عملیات نشانی شناخته‌شده نیست.");
  }catch(error){return apiFailure(error);}
}

function parseAddressPatch(form: FormData): CustomerAddressUpdateBody | null {
  const recipient_name=clean(form.get("recipient_name"),150);
  const recipient_mobile=String(form.get("recipient_mobile")??"").trim();
  const postal_code=String(form.get("postal_code")??"").trim();
  const address_line=clean(form.get("address_line"),1000);
  const building_no=clean(form.get("building_no"),30,true);
  const unit_no=clean(form.get("unit_no"),30,true);
  if(!recipient_name||!/^09\d{9}$/.test(recipient_mobile)||!/^\d{10}$/.test(postal_code)||!address_line)return null;
  return {recipient_name,recipient_mobile,postal_code,address_line,building_no,unit_no};
}
function clean(value:FormDataEntryValue|null,max:number,nullable=false):string|null{const v=String(value??"").trim().replace(/\s+/g," ");if(!v)return nullable?null:null;return v.length<=max?v:null;}
function apiFailure(error:unknown):CheckoutAddressActionResult{
  if(error instanceof ApiClientError){const statusCode=error.status===401?401:error.status===403?403:error.status===404?404:error.status===409?409:error.status===422?422:503;return {kind:"data",statusCode,message:statusCode===409?"نشانی هم‌زمان تغییر کرده است؛ نسخه تازه را دوباره بررسی کنید.":statusCode===503?"نتیجه تغییر نشانی قطعی نشد؛ بدون ساختن موفقیت دوباره وضعیت را بررسی کنید.":"امکان ادامه عملیات نشانی وجود ندارد.",requestId:error.requestId};}
  return {kind:"data",statusCode:503,message:"امکان ادامه عملیات نشانی وجود ندارد.",requestId:null};
}
function invalid(message:string,statusCode=422):CheckoutAddressActionResult{return {kind:"data",statusCode,message,requestId:null};}
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
