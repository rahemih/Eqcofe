import { createHash } from 'node:crypto';

export type ManagementExportDataset='sales_revenue_daily'|'profit_daily'|'inventory_snapshot'|'customer_lifetime'|'wholesale_applications'|'fulfillment_operations'|'shipment_operations'|'return_operations'|'warranty_operations';
export type ManagementExportFormat='csv'|'json';
const MAX_BYTES=5*1024*1024;
const COLUMNS:Record<ManagementExportDataset,readonly string[]>={
  sales_revenue_daily:['businessDate','orderCount','cancelledCount','grossSalesToman','paidSalesToman','sourceWatermark'],
  profit_daily:['businessDate','revenueToman','cogsToman','operatingCostToman','profitToman','grossProfitToman','grossMarginBps','netMarginBps','sourceWatermark'],
  inventory_snapshot:['variantId','availableQuantity','reservedQuantity','stockState','capturedAt','sourceWatermark'],
  customer_lifetime:['customerId','orderCount','lifetimeValueToman','lastOrderAt','sourceWatermark'],
  wholesale_applications:['applicationId','customerId','status','submittedAt','reviewStartedAt','reviewedAt','sourceWatermark'],
  fulfillment_operations:['id','orderId','status','startedAt','completedAt','ageSeconds','cycleSeconds','sourceVersion','sourceWatermark'],
  shipment_operations:['id','orderId','status','startedAt','completedAt','ageSeconds','cycleSeconds','sourceVersion','sourceWatermark'],
  return_operations:['id','orderId','status','startedAt','completedAt','ageSeconds','cycleSeconds','sourceVersion','sourceWatermark'],
  warranty_operations:['id','orderId','status','startedAt','completedAt','ageSeconds','cycleSeconds','sourceVersion','sourceWatermark'],
};
function scalar(value:unknown):string|number|boolean|null{
  if(value==null)return null;if(value instanceof Date){if(Number.isNaN(value.getTime()))throw new Error('ANALYTICS_EXPORT_DATE_INVALID');return value.toISOString();}
  if(typeof value==='number'){if(!Number.isSafeInteger(value))throw new Error('ANALYTICS_EXPORT_INTEGER_INVALID');return value;}
  if(typeof value==='string'||typeof value==='boolean')return value;throw new Error('ANALYTICS_EXPORT_VALUE_INVALID');
}
function csvCell(value:unknown){let s=String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'');if(/^[\s]*[=+\-@]/.test(s))s=`'${s}`;return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
export function serializeManagementExport(input:{dataset:ManagementExportDataset;format:ManagementExportFormat;rows:Record<string,unknown>[];generatedAt:Date;sourceWatermark:Date|null;exportId:string}){
  const columns=COLUMNS[input.dataset];const rows=input.rows.map(row=>Object.fromEntries(columns.map(key=>[key,scalar(row[key])])));
  const content=input.format==='csv'?`\uFEFF${columns.join(',')}\r\n${rows.map(row=>columns.map(key=>csvCell(row[key])).join(',')).join('\r\n')}`:
    JSON.stringify({contractVersion:'eqcofe-analytics-export-v1',dataset:input.dataset,generatedAt:input.generatedAt.toISOString(),sourceWatermark:input.sourceWatermark?.toISOString()??null,rowCount:rows.length,rows},null,2);
  if(Buffer.byteLength(content,'utf8')>MAX_BYTES)throw new Error('ANALYTICS_EXPORT_CONTENT_TOO_LARGE');
  const extension=input.format,mimeType=input.format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8';
  const stamp=input.generatedAt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  return{content,mimeType,filename:`eqcofe-${input.dataset}-${stamp}-${input.exportId.slice(0,8)}.${extension}`,contentHash:createHash('sha256').update(content).digest('hex'),rowCount:rows.length};
}
