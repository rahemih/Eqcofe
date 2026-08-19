import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { FinanceRepository } from '../infrastructure/finance.repository';

type ReportKey='finance_summary'|'profit_by_order'|'costs_by_type'|'owner_distribution'|'journal_trial_balance';

type RunInput={report_key:ReportKey;from?:string|null;to?:string|null;limit?:number|null};

function date(v:unknown,name:string){
  if(v===undefined||v===null||v==='')return null;
  const d=new Date(String(v));
  if(Number.isNaN(d.getTime()))throw new DomainError('VALIDATION_ERROR',`${name} معتبر نیست.`);
  return d;
}
function safeLimit(v:unknown){const n=Number(v??200);return Number.isInteger(n)&&n>0?Math.min(n,1000):200;}
function csvCell(v:unknown){const s=v===null||v===undefined?'':typeof v==='object'?JSON.stringify(v):String(v);return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function toCsv(rows:any[]){if(!rows.length)return '';const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];return [headers.map(csvCell).join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\n');}

@Injectable()
export class FinanceReportingService{
  constructor(private readonly repo:FinanceRepository,private readonly tx:TransactionManager){}
  catalog(){return[
    {key:'finance_summary',title_fa:'خلاصه مالی',supports_period:true},
    {key:'profit_by_order',title_fa:'سود سفارش‌ها',supports_period:true},
    {key:'costs_by_type',title_fa:'هزینه‌ها بر اساس نوع',supports_period:true},
    {key:'owner_distribution',title_fa:'تقسیم سود مالکان',supports_period:true},
    {key:'journal_trial_balance',title_fa:'تراز آزمایشی اسناد ثبت‌شده',supports_period:true},
  ];}
  async run(input:RunInput){
    if(!this.catalog().some(x=>x.key===input.report_key))throw new DomainError('FINANCE_REPORT_UNSUPPORTED','گزارش مالی پشتیبانی نمی‌شود.');
    const from=date(input.from,'از تاریخ'),to=date(input.to,'تا تاریخ');
    if(from&&to&&from>to)throw new DomainError('VALIDATION_ERROR','بازه زمانی گزارش نامعتبر است.');
    const params={from,to,limit:safeLimit(input.limit)};
    const result=await this.repo.runFinanceReport(input.report_key,params);
    return this.tx.run(async ex=>this.repo.createReportJob(ex,{id:randomUUID(),reportKey:input.report_key,parameters:{from:from?.toISOString()??null,to:to?.toISOString()??null,limit:params.limit},result}));
  }
  get(id:string){return this.repo.reportJobById(id);}
  async cancel(id:string,reason:string){return this.tx.run(async ex=>this.repo.cancelReportJob(ex,id,reason));}
  async createExport(input:{report_job_id:string;format:'csv'|'json'}){
    const job=await this.repo.reportJobById(input.report_job_id);
    if(job.status!=='completed')throw new DomainError('FINANCE_REPORT_NOT_COMPLETED','گزارش هنوز آماده خروجی نیست.');
    if(!['csv','json'].includes(input.format))throw new DomainError('VALIDATION_ERROR','فرمت خروجی پشتیبانی نمی‌شود.');
    const rows=Array.isArray(job.result_json)?job.result_json:[job.result_json];
    const content=input.format==='csv'?toCsv(rows):JSON.stringify(job.result_json,null,2);
    const mime=input.format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8';
    const filename=`eqcofe-finance-${job.report_key}-${String(job.id).slice(0,8)}.${input.format}`;
    return this.tx.run(async ex=>this.repo.createExport(ex,{id:randomUUID(),reportJobId:String(job.id),format:input.format,filename,mimeType:mime,content}));
  }
  getExport(id:string){return this.repo.exportById(id,false);}
  async download(id:string){const x=await this.repo.exportById(id,true);return{id:x.id,filename:x.filename,mime_type:x.mime_type,format:x.format,content:x.content_text};}
}
