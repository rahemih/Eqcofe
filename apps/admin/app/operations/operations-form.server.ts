export type OperationsFormIssue={field:string;message:string};

export function isTrustedOperationsFormOrigin(request:Request):boolean{
  const origin=request.headers.get("origin");
  if(origin)return origin===new URL(request.url).origin;
  const site=request.headers.get("sec-fetch-site");
  return site==="same-origin"||site==="none";
}

export function operationsUuid(value:FormDataEntryValue|null):string|null{
  if(typeof value!=="string")return null;
  const v=value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null;
}

export function operationsInteger(value:FormDataEntryValue|null):number|null{
  if(typeof value!=="string"||value.trim()==="")return null;
  const n=Number(value);
  return Number.isSafeInteger(n)?n:null;
}

export function operationsFiniteNumber(value:FormDataEntryValue|null):number|null{
  if(typeof value!=="string"||value.trim()==="")return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

export function operationsText(value:FormDataEntryValue|null,max:number):string|null{
  if(typeof value!=="string")return null;
  const v=value.trim();
  if(!v||v.length>max||/[\r\n\0]/.test(v))return null;
  return v;
}
