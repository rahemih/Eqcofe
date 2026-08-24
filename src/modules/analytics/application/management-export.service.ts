import { Injectable } from '@nestjs/common';
import { createHash,randomUUID } from 'node:crypto';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { ManagementExportRepository } from '../infrastructure/management-export.repository';
import { CustomerManagementService } from './customer-management.service';
import { InventoryManagementService } from './inventory-management.service';
import { OperationalKind,OperationalManagementService } from './operational-management.service';
import { ProfitManagementService } from './profit-management.service';
import { SalesRevenueManagementService } from './sales-revenue-management.service';
import { WholesaleManagementService } from './wholesale-management.service';
import { ManagementExportDataset,ManagementExportFormat,serializeManagementExport } from './management-export.serializer';

const DATASETS=new Set<ManagementExportDataset>(['sales_revenue_daily','profit_daily','inventory_snapshot','customer_lifetime','wholesale_applications','fulfillment_operations','shipment_operations','return_operations','warranty_operations']);
function boundedLimit(value:unknown){if(value==null||value==='')return 500;const n=Number(value);if(!Number.isInteger(n)||n<1||n>500)throw new DomainError('ANALYTICS_EXPORT_LIMIT_INVALID','محدوده ردیف خروجی معتبر نیست.');return n;}
function text(value:unknown,key:string){const v=String(value??'').trim();if(!v)throw new DomainError('ANALYTICS_EXPORT_PARAMETERS_INVALID',`پارامتر ${key} الزامی است.`);return v;}
function stable(value:any):string{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(stable).join(',')}]`;return`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;}

@Injectable()
export class ManagementExportService{
  constructor(private readonly repo:ManagementExportRepository,private readonly tx:TransactionManager,private readonly audit:AuditWriter,private readonly ctx:RequestContextStore,
    private readonly sales:SalesRevenueManagementService,private readonly profit:ProfitManagementService,private readonly inventory:InventoryManagementService,
    private readonly customers:CustomerManagementService,private readonly wholesale:WholesaleManagementService,private readonly operations:OperationalManagementService){}

  async create(input:{dataset:unknown;format:unknown;parameters?:Record<string,unknown>;idempotencyKey:unknown}){
    const actor=this.staff(),dataset=String(input?.dataset) as ManagementExportDataset,format=String(input?.format) as ManagementExportFormat;
    if(!DATASETS.has(dataset))throw new DomainError('ANALYTICS_EXPORT_DATASET_INVALID','Dataset خروجی پشتیبانی نمی‌شود.');
    if(!['csv','json'].includes(format))throw new DomainError('ANALYTICS_EXPORT_FORMAT_INVALID','فرمت خروجی پشتیبانی نمی‌شود.');
    const key=String(input?.idempotencyKey??'').normalize('NFKC').trim();if(key.length<8||key.length>200)throw new DomainError('ANALYTICS_EXPORT_IDEMPOTENCY_INVALID','شناسه تکرارپذیری خروجی معتبر نیست.');
    const parameters=this.parameters(dataset,input?.parameters??{}),id=randomUUID(),idempotencyHash=createHash('sha256').update(key).digest('hex');
    const claim=await this.tx.run(async ex=>{const result=await this.repo.claim(ex,{id,dataset,format,parameters,requestedBy:actor.id!,idempotencyHash});if(!result.replay)await this.logWith(ex,'analytics.export.create',id,{dataset,format,status:'running'});return result;});
    if(claim.replay){if(String(claim.job.dataset_key)!==dataset||String(claim.job.format)!==format||stable(claim.job.parameters)!==stable(parameters))throw new DomainError('ANALYTICS_EXPORT_IDEMPOTENCY_CONFLICT','شناسه تکرارپذیری برای درخواست متفاوت استفاده شده است.');return{job:claim.job,replay:true};}
    try{
      const generatedAt=new Date(),data=await this.dataset(dataset,parameters),artifact=serializeManagementExport({dataset,format,rows:data.rows,generatedAt,sourceWatermark:data.sourceWatermark,exportId:id});
      const evidence={dataset,format,row_count:artifact.rowCount,source_watermark:data.sourceWatermark?.toISOString()??null,content_hash:artifact.contentHash};
      const job=await this.tx.run(async ex=>{const completed=await this.repo.complete(ex,id,{rowCount:artifact.rowCount,sourceWatermark:data.sourceWatermark,filename:artifact.filename,mimeType:artifact.mimeType,contentHash:artifact.contentHash,content:artifact.content});await this.logWith(ex,'analytics.export.complete',id,evidence);return completed;});
      return{job,replay:false};
    }catch(error){const code=this.errorCode(error);await this.tx.run(async ex=>{await this.repo.fail(ex,id,code);await this.logWith(ex,'analytics.export.fail',id,{dataset,format,error_code:code});});throw error;}
  }

  async list(limitInput?:unknown){return this.repo.list(this.staff().id!,boundedLimit(limitInput));}
  async get(id:unknown){const actor=this.staff(),job=await this.repo.byId(this.uuid(id),actor.id!,false);if(!job)throw new DomainError('ANALYTICS_EXPORT_NOT_FOUND','خروجی مدیریتی پیدا نشد.');return job;}
  async download(idInput:unknown){const actor=this.staff(),id=this.uuid(idInput);try{const job=await this.repo.byId(id,actor.id!,true);if(!job)throw new DomainError('ANALYTICS_EXPORT_NOT_FOUND','خروجی مدیریتی پیدا نشد.');if(job.status!=='completed'||job.content_text==null)throw new DomainError('ANALYTICS_EXPORT_NOT_READY','خروجی مدیریتی آماده دانلود نیست.');await this.log('analytics.export.download',id,{dataset:job.dataset_key,format:job.format,row_count:job.row_count,source_watermark:job.source_watermark,content_hash:job.content_hash,outcome:'success'});return{filename:String(job.filename),mimeType:String(job.mime_type),content:String(job.content_text),headers:{'Content-Disposition':`attachment; filename="${job.filename}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store, private'}};}catch(error){await this.log('analytics.export.download',id,{outcome:'failed',error_code:this.errorCode(error)});throw error;}}

  private parameters(dataset:ManagementExportDataset,p:Record<string,unknown>){const limit=boundedLimit(p.limit);if(dataset==='sales_revenue_daily'||dataset==='profit_daily')return{from:text(p.from,'from'),to:text(p.to,'to')};if(dataset.endsWith('_operations'))return{from:text(p.from,'from'),to:text(p.to,'to'),asOf:text(p.asOf,'asOf'),limit};return{limit};}
  private async dataset(dataset:ManagementExportDataset,p:any):Promise<{rows:Record<string,unknown>[];sourceWatermark:Date|null}>{
    if(dataset==='sales_revenue_daily'){const x=await this.sales.read(p.from,p.to);return{rows:x.daily as any,sourceWatermark:x.sourceWatermark};}
    if(dataset==='profit_daily'){const x=await this.profit.read(p.from,p.to);return{rows:x.daily as any,sourceWatermark:x.sourceWatermark};}
    if(dataset==='inventory_snapshot'){const x=await this.inventory.read(p.limit);return{rows:x.rows as any,sourceWatermark:x.sourceWatermark};}
    if(dataset==='customer_lifetime'){const x=await this.customers.read(p.limit);return{rows:x.rows as any,sourceWatermark:x.sourceWatermark};}
    if(dataset==='wholesale_applications'){const x=await this.wholesale.read(p.limit);return{rows:x.rows as any,sourceWatermark:x.sourceWatermark};}
    const kind=dataset.replace('_operations','') as OperationalKind,x=await this.operations.readOne(kind,p);return{rows:x.rows as any,sourceWatermark:x.sourceWatermark};
  }
  private staff(){const a=this.ctx.get()?.actor;if(a?.type!=='staff'||!a.id)throw new DomainError('ANALYTICS_STAFF_REQUIRED','عملیات خروجی فقط برای کاربر سازمانی مجاز است.');return a;}
  private uuid(value:unknown){const x=String(value??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('ANALYTICS_EXPORT_ID_INVALID','شناسه خروجی معتبر نیست.');return x;}
  private errorCode(error:unknown){const code=(error as any)?.code??(error as any)?.message??'ANALYTICS_EXPORT_FAILED';return /^[A-Z0-9_]{3,120}$/.test(String(code))?String(code):'ANALYTICS_EXPORT_FAILED';}
  private async logWith(ex:any,action:string,id:string,afterData:unknown){const c=this.ctx.require();await this.audit.writeWith(ex,{actorType:'staff',actorId:c.actor.id,action,resourceType:'analytics_management_export',resourceId:id,afterData,requestId:c.requestId,traceId:c.correlationId});}
  private async log(action:string,id:string,afterData:unknown){const c=this.ctx.require();await this.audit.write({actorType:'staff',actorId:c.actor.id,action,resourceType:'analytics_management_export',resourceId:id,afterData,requestId:c.requestId,traceId:c.correlationId});}
}
