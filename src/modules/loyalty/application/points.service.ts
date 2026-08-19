import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { CustomerRepository } from '../../customer/infrastructure/customer.repository';
import { PointsRepository } from '../infrastructure/points.repository';

@Injectable()
export class PointsService {
  constructor(private readonly tx:TransactionManager,private readonly points:PointsRepository,private readonly customers:CustomerRepository) {}

  async balance(customerId:string){ await this.active(customerId); return {customer_id:customerId,balance:await this.points.balance(customerId),unit:'points' as const,cash_value:null}; }
  async history(customerId:string,limit=100){ await this.active(customerId); const safe=Number.isSafeInteger(limit)?Math.min(Math.max(limit,1),200):100; return {items:await this.points.history(customerId,safe)}; }

  async earn(input:{customerId:string;points:number;referenceType:string;referenceId:string;metadata?:Record<string,unknown>}){ return this.append(input.customerId,'earn',this.positive(input.points),input.referenceType,input.referenceId,null,input.metadata); }
  async redeem(input:{customerId:string;points:number;referenceType:string;referenceId:string;metadata?:Record<string,unknown>}){ return this.append(input.customerId,'redeem',-this.positive(input.points),input.referenceType,input.referenceId,null,input.metadata); }
  async expire(input:{customerId:string;points:number;referenceType:string;referenceId:string;metadata?:Record<string,unknown>}){ return this.append(input.customerId,'expire',-this.positive(input.points),input.referenceType,input.referenceId,null,input.metadata); }
  async adjust(input:{customerId:string;pointsDelta:number;referenceType:string;referenceId:string;metadata?:Record<string,unknown>}){ return this.append(input.customerId,'adjust',this.nonZero(input.pointsDelta),input.referenceType,input.referenceId,null,input.metadata); }

  async reverse(input:{customerId:string;entryId:string;referenceType:string;referenceId:string;metadata?:Record<string,unknown>}){
    await this.active(input.customerId);
    return this.tx.run(async ex=>{
      const original=await this.points.byId(input.customerId,input.entryId,ex,true);
      if(!original||original.entry_type==='reverse') throw new DomainError('LOYALTY_INVALID_REVERSAL','رکورد امتیاز قابل برگشت نیست.');
      const row=await this.points.append(ex,{id:randomUUID(),customerId:input.customerId,type:'reverse',pointsDelta:-Number(original.points_delta),referenceType:this.ref(input.referenceType,80),referenceId:this.ref(input.referenceId,200),reversesEntryId:original.id,metadata:input.metadata});
      if(!row){ const existing=(await this.points.history(input.customerId,200,ex)).find(x=>x.entry_type==='reverse'&&x.reference_type===input.referenceType&&x.reference_id===input.referenceId); if(existing)return existing; throw new DomainError('LOYALTY_DUPLICATE_ENTRY','ثبت تکراری Ledger مجاز نیست.'); }
      return row;
    });
  }

  private async append(customerId:string,type:string,delta:number,referenceType:string,referenceId:string,reversesEntryId:string|null,metadata?:Record<string,unknown>){
    await this.active(customerId); const rt=this.ref(referenceType,80),ri=this.ref(referenceId,200);
    return this.tx.run(async ex=>{
      const row=await this.points.append(ex,{id:randomUUID(),customerId,type,pointsDelta:delta,referenceType:rt,referenceId:ri,reversesEntryId,metadata});
      if(row)return row;
      const existing=(await this.points.history(customerId,200,ex)).find(x=>x.entry_type===type&&x.reference_type===rt&&x.reference_id===ri);
      if(existing&&Number(existing.points_delta)===delta)return existing;
      throw new DomainError('LOYALTY_DUPLICATE_ENTRY','مرجع Ledger قبلاً با مقدار دیگری ثبت شده است.');
    });
  }
  private async active(id:string){ const c=await this.customers.profileById(id); if(!c||c.status!=='active')throw new DomainError('CUSTOMER_NOT_ACTIVE','مشتری فعال پیدا نشد.'); }
  private positive(v:number){ if(!Number.isSafeInteger(v)||v<=0)throw new DomainError('LOYALTY_INVALID_POINTS','امتیاز باید عدد صحیح مثبت باشد.'); return v; }
  private nonZero(v:number){ if(!Number.isSafeInteger(v)||v===0)throw new DomainError('LOYALTY_INVALID_POINTS','تغییر امتیاز باید عدد صحیح غیرصفر باشد.'); return v; }
  private ref(v:string,max:number){ const x=String(v??'').trim(); if(!x||x.length>max)throw new DomainError('LOYALTY_REFERENCE_REQUIRED','مرجع Ledger معتبر نیست.'); return x; }
}
