import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export const EXCEL_MIME="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
export const EXCEL_MAX_UPLOAD_BYTES=10*1024*1024;

export type ExcelBinaryWorkbook=ApiComponents["schemas"]["ExcelBinaryWorkbook"];
export type ExcelWorkbookTemplate=ApiComponents["schemas"]["ExcelWorkbookTemplate"];
export type ExcelDryRunData=ApiComponents["schemas"]["ExcelDryRunData"];
export type ExcelCatalogPreviewData=ApiComponents["schemas"]["ExcelCatalogPreviewData"];
export type ExcelPricingPreviewData=ApiComponents["schemas"]["ExcelPricingPreviewData"];
export type ExcelImportData=ApiComponents["schemas"]["ExcelImportData"];
export type ExcelCatalogApplyData=ApiComponents["schemas"]["ExcelCatalogApplyData"];
export type ExcelPricingApplyData=ApiComponents["schemas"]["ExcelPricingApplyData"];
export type ExcelRecoveryData=ApiComponents["schemas"]["ExcelRecoveryData"];
type FieldError=ApiComponents["schemas"]["FieldError"];

type Common={requestId:string|null;setCookies:readonly string[]};
export type ExcelFailure=
  |({kind:"denied"|"step_up_required"|"conflict"|"not_found"|"unknown_outcome"|"unavailable"}&Common)
  |({kind:"invalid";fieldErrors:readonly FieldError[]}&Common);

export type ExcelTemplateResult=({kind:"ready";template:ExcelWorkbookTemplate}&Common)|ExcelFailure;
export type ExcelDryRunResult=({kind:"ready";data:ExcelDryRunData}&Common)|ExcelFailure;
export type ExcelCatalogPreviewResult=({kind:"ready";data:ExcelCatalogPreviewData}&Common)|ExcelFailure;
export type ExcelPricingPreviewResult=({kind:"ready";data:ExcelPricingPreviewData}&Common)|ExcelFailure;
export type ExcelImportResult=({kind:"confirmed";data:ExcelImportData}&Common)|ExcelFailure;
export type ExcelCatalogApplyResult=({kind:"confirmed";data:ExcelCatalogApplyData}&Common)|ExcelFailure;
export type ExcelPricingApplyResult=({kind:"confirmed";data:ExcelPricingApplyData}&Common)|ExcelFailure;
export type ExcelRecoveryResult=({kind:"confirmed";data:ExcelRecoveryData}&Common)|ExcelFailure;

export type ExcelUploadParse=
  |{ok:true;workbook:ExcelBinaryWorkbook;digest:string;byteLength:number}
  |{ok:false;message:string};

export async function parseExcelUpload(value:FormDataEntryValue|null):Promise<ExcelUploadParse>{
  if(!(value instanceof File)||!value.name){
    return{ok:false,message:"فایل XLSX انتخاب نشده است."};
  }
  const name=value.name.normalize("NFKC").trim();
  if(!name||name.length>240||!name.toLowerCase().endsWith(".xlsx")){
    return{ok:false,message:"فقط فایل XLSX با نام معتبر پذیرفته می‌شود."};
  }
  if(value.size<=0||value.size>EXCEL_MAX_UPLOAD_BYTES){
    return{ok:false,message:"حجم فایل باید بیشتر از صفر و حداکثر ۱۰ MiB باشد."};
  }
  const bytes=new Uint8Array(await value.arrayBuffer());
  if(bytes.byteLength<=0||bytes.byteLength>EXCEL_MAX_UPLOAD_BYTES){
    return{ok:false,message:"حجم فایل XLSX خارج از محدوده مجاز است."};
  }
  const digest=createHash("sha256").update(bytes).digest("hex");
  return{
    ok:true,
    workbook:{
      fileName:name,
      mimeType:EXCEL_MIME,
      contentBase64:Buffer.from(bytes).toString("base64"),
    },
    digest,
    byteLength:bytes.byteLength,
  };
}

export function excelImportIdempotencyKey(digest:string):string{
  return digestKey("excel-import",digest);
}
export function excelCatalogApplyIdempotencyKey(previewHash:string):string{
  return digestKey("excel-catalog",previewHash);
}
export function excelPricingApplyIdempotencyKey(previewHash:string):string{
  return digestKey("excel-pricing",previewHash);
}
export function excelRecoveryIdempotencyKey(jobId:string,note:string):string{
  if(!isUuid(jobId))throw new Error("EXCEL_RECOVERY_JOB_INVALID");
  const digest=createHash("sha256").update(jobId+"\n"+normalizeNote(note)).digest("hex");
  return `excel-recover:${jobId.toLowerCase()}:${digest.slice(0,32)}`;
}

export async function readExcelTemplate(request:Pick<Request,"headers">):Promise<ExcelTemplateResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("get","/admin/excel/exports/template",{});
    return{kind:"ready",template:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],false);}
}

export async function dryRunExcel(
  request:Pick<Request,"headers">,
  workbook:ExcelBinaryWorkbook,
):Promise<ExcelDryRunResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/excel/dry-run",{body:{workbook}});
    return{kind:"ready",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],false);}
}

export async function previewExcelCatalog(
  request:Pick<Request,"headers">,
  workbook:ExcelBinaryWorkbook,
):Promise<ExcelCatalogPreviewResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/excel/catalog/preview",{body:{workbook}});
    return{kind:"ready",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],false);}
}

export async function previewExcelPricing(
  request:Pick<Request,"headers">,
  workbook:ExcelBinaryWorkbook,
):Promise<ExcelPricingPreviewResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/excel/pricing/preview",{body:{workbook}});
    return{kind:"ready",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],false);}
}

export async function createExcelImport(
  request:Pick<Request,"headers">,
  workbook:ExcelBinaryWorkbook,
  idempotencyKey:string,
):Promise<ExcelImportResult>{
  if(!isIdempotencyKey(idempotencyKey))return invalidKey();
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/excel/imports",{headers:{"Idempotency-Key":idempotencyKey},body:{workbook}});
    return{kind:"confirmed",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],true);}
}

export async function applyExcelCatalog(
  request:Pick<Request,"headers">,
  stepUpToken:string,
  idempotencyKey:string,
  workbook:ExcelBinaryWorkbook,
  previewHash:string,
):Promise<ExcelCatalogApplyResult>{
  if(!isStepUpToken(stepUpToken))return{kind:"step_up_required",requestId:null,setCookies:[]};
  if(!isIdempotencyKey(idempotencyKey))return invalidKey();
  if(!isHash(previewHash))return invalidHash();
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/excel/catalog/apply",{
      headers:{"Idempotency-Key":idempotencyKey},
      body:{workbook,expected_preview_hash:previewHash.toLowerCase()},
    });
    return{kind:"confirmed",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],true);}
}

export async function applyExcelPricing(
  request:Pick<Request,"headers">,
  stepUpToken:string,
  idempotencyKey:string,
  workbook:ExcelBinaryWorkbook,
  previewHash:string,
):Promise<ExcelPricingApplyResult>{
  if(!isStepUpToken(stepUpToken))return{kind:"step_up_required",requestId:null,setCookies:[]};
  if(!isIdempotencyKey(idempotencyKey))return invalidKey();
  if(!isHash(previewHash))return invalidHash();
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/excel/pricing/apply",{
      headers:{"Idempotency-Key":idempotencyKey},
      body:{workbook,expected_preview_hash:previewHash.toLowerCase()},
    });
    return{kind:"confirmed",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],true);}
}

export async function recoverExcelImport(
  request:Pick<Request,"headers">,
  stepUpToken:string,
  idempotencyKey:string,
  jobId:string,
  note:string,
):Promise<ExcelRecoveryResult>{
  if(!isStepUpToken(stepUpToken))return{kind:"step_up_required",requestId:null,setCookies:[]};
  if(!isUuid(jobId))return{kind:"invalid",requestId:null,fieldErrors:[fieldError("job_id","INVALID_JOB_ID","شناسه Import معتبر نیست.")],setCookies:[]};
  if(!isIdempotencyKey(idempotencyKey))return invalidKey();
  const normalized=normalizeNote(note);
  if(normalized.length<3||normalized.length>500||hasControlCharacters(normalized)){
    return{kind:"invalid",requestId:null,fieldErrors:[fieldError("note","INVALID_NOTE","یادداشت بازیابی باید بین ۳ تا ۵۰۰ نویسه معتبر باشد.")],setCookies:[]};
  }
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/excel/imports/{id}/recover",{
      pathParams:{id:jobId},
      headers:{"Idempotency-Key":idempotencyKey},
      body:{note:normalized},
    });
    return{kind:"confirmed",data:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[],true);}
}

function classifyFailure(error:unknown,setCookies:readonly string[],mutation:boolean):ExcelFailure{
  if(!(error instanceof ApiClientError))return{kind:mutation?"unknown_outcome":"unavailable",requestId:null,setCookies};
  if(error.kind==="network"||error.kind==="timeout"||error.kind==="aborted"){
    return{kind:mutation?"unknown_outcome":"unavailable",requestId:error.requestId,setCookies};
  }
  if(error.kind==="http"){
    if(error.code==="STEP_UP_REQUIRED")return{kind:"step_up_required",requestId:error.requestId,setCookies};
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
    if(error.status===409||error.status===412||error.status===428)return{kind:"conflict",requestId:error.requestId,setCookies};
    if(error.status===400||error.status===413||error.status===415||error.status===422){
      return{kind:"invalid",requestId:error.requestId,fieldErrors:Object.freeze([...error.fieldErrors]),setCookies};
    }
    if(error.status===408||(typeof error.status==="number"&&error.status>=500)){
      return{kind:mutation?"unknown_outcome":"unavailable",requestId:error.requestId,setCookies};
    }
  }
  return{kind:"unavailable",requestId:error.requestId,setCookies};
}

function digestKey(prefix:string,value:string):string{
  const x=value.trim().toLowerCase();
  if(!isHash(x))throw new Error("EXCEL_DIGEST_INVALID");
  return `${prefix}:${x}`;
}
function normalizeNote(value:string):string{return value.normalize("NFKC").trim().replace(/\s+/g," ");}
function isHash(value:string):boolean{return /^[0-9a-f]{64}$/i.test(value);}
function isUuid(value:string):boolean{return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function isStepUpToken(value:string):boolean{return typeof value==="string"&&value.length>=8&&value.length<=4096&&!hasControlCharacters(value);}
function isIdempotencyKey(value:string):boolean{return typeof value==="string"&&value.length>=8&&value.length<=200&&/^[A-Za-z0-9._:-]+$/.test(value);}
function hasControlCharacters(value:string):boolean{for(const ch of value){const code=ch.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}return false;}
function fieldError(field:string,code:string,message:string):FieldError{return{field,code,message};}
function invalidKey():ExcelFailure{return{kind:"invalid",requestId:null,fieldErrors:[fieldError("idempotency_key","INVALID_IDEMPOTENCY_KEY","کلید idempotency معتبر نیست.")],setCookies:[]};}
function invalidHash():ExcelFailure{return{kind:"invalid",requestId:null,fieldErrors:[fieldError("preview_hash","INVALID_PREVIEW_HASH","شناسه Preview معتبر نیست.")],setCookies:[]};}
