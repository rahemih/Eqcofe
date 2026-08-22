import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { createPhysicalSale, addPhysicalSaleLine } from '../domain/physical-sale';
import { PhysicalSaleRepository } from '../infrastructure/physical-sale.repository';
import { OfflineCommandRepository } from '../infrastructure/offline-command.repository';
import { PhysicalSaleService } from './physical-sale.service';
import { PosPricingSnapshotService } from './pos-pricing-snapshot.service';
import { PhysicalSaleCommitService } from './physical-sale-commit.service';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SaleSyncPayload={warehouse_id:string;customer_type:'retail'|'wholesale';payment_method:'cash'|'card';external_reference:string|null;lines:{variant_id:string;quantity:number}[]};

@Injectable()
export class OfflineCommandSyncService {
  constructor(
    private readonly tx:TransactionManager,
    private readonly commands:OfflineCommandRepository,
    private readonly sales:PhysicalSaleService,
    private readonly saleRepo:PhysicalSaleRepository,
    private readonly pricing:PosPricingSnapshotService,
    private readonly commit:PhysicalSaleCommitService,
    private readonly ctx:RequestContextStore,
  ){}

  capture(input:{clientCommandId:unknown;commandType:unknown;payload:unknown}){
    const actor=this.staff();
    const clientCommandId=this.uuid(input.clientCommandId,'POS_OFFLINE_COMMAND_ID_INVALID');
    const commandType=String(input.commandType??'');
    if(commandType!=='sale.sync')throw new DomainError('POS_OFFLINE_COMMAND_TYPE_INVALID','نوع فرمان آفلاین POS معتبر نیست.');
    const payload=this.saleSyncPayload(input.payload);
    const payloadHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return this.tx.run(async ex=>{
      const created=await this.commands.create(ex,{id:randomUUID(),clientCommandId,staffActorId:actor.id!,commandType,payload,payloadHash});
      if(created)return created;
      const replay=await this.commands.byClientCommandId(ex,clientCommandId,true);
      if(!replay||String(replay.staff_actor_id)!==actor.id||String(replay.command_type)!==commandType||String(replay.payload_hash)!==payloadHash){
        throw new DomainError('POS_OFFLINE_IDEMPOTENCY_CONFLICT','شناسه فرمان آفلاین با درخواست دیگری استفاده شده است.');
      }
      return replay;
    });
  }

  async sync(clientCommandIdInput:unknown){
    const actor=this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput,'POS_OFFLINE_COMMAND_ID_INVALID');
    const command=await this.tx.run(ex=>this.commands.byClientCommandId(ex,clientCommandId,true));
    if(!command||String(command.staff_actor_id)!==actor.id)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
    if(String(command.status)==='applied')return command;
    if(String(command.status)==='failed')throw new DomainError('POS_OFFLINE_COMMAND_FAILED','فرمان آفلاین قبلاً ناموفق ثبت شده و بازیابی آن به مرحله reconciliation واگذار شده است.',{error_code:command.error_code});

    const payload=this.saleSyncPayload(command.payload);
    try{
      const sale=await this.sales.createDraft({clientCommandId,staffActorId:actor.id});
      if(String(sale.status)==='committed')return this.markApplied(String(command.id),sale);
      if(String(sale.status)!=='draft')throw new DomainError('POS_OFFLINE_SALE_NOT_SYNCABLE','فروش متناظر فرمان آفلاین قابل همگام‌سازی نیست.');

      for(let i=0;i<payload.lines.length;i++)await this.applyLine(String(command.id),i,String(sale.id),actor.id!,payload.lines[i]);
      await this.pricing.priceDraft({saleId:String(sale.id),staffActorId:actor.id!,customerType:payload.customer_type});
      const priced=await this.saleRepo.byId(String(sale.id));
      if(!priced||String(priced.status)!=='draft')throw new DomainError('POS_OFFLINE_SALE_CHANGED','وضعیت فروش هنگام همگام‌سازی تغییر کرده است.');
      const committed=await this.commit.commit({saleId:String(sale.id),warehouseId:payload.warehouse_id,expectedVersion:Number(priced.version),paymentMethod:payload.payment_method,externalReference:payload.external_reference});
      return this.markApplied(String(command.id),committed);
    }catch(error:any){
      const code=typeof error?.code==='string'&&error.code.length<=120?error.code:'POS_OFFLINE_SYNC_FAILED';
      await this.tx.run(ex=>this.commands.markFailed(ex,String(command.id),code));
      throw error;
    }
  }

  private async applyLine(commandId:string,lineIndex:number,saleId:string,staffActorId:string,line:{variant_id:string;quantity:number}){
    return this.tx.run(async ex=>{
      await this.commands.lockLineIdentity(ex,commandId,lineIndex);
      const prior=await this.commands.lineEffect(ex,commandId,lineIndex);
      if(prior){
        if(String(prior.sale_id)!==saleId||String(prior.variant_id)!==line.variant_id||Number(prior.quantity)!==line.quantity)throw new DomainError('POS_OFFLINE_LINE_IDEMPOTENCY_CONFLICT','اثر قبلی فرمان آفلاین با payload فعلی سازگار نیست.');
        return prior;
      }
      const sale=await this.saleRepo.byId(saleId,ex,true);
      if(!sale||String(sale.staff_actor_id)!==staffActorId)throw new DomainError('POS_SALE_NOT_FOUND','فروش فیزیکی پیدا نشد.');
      if(String(sale.status)!=='draft')throw new DomainError('POS_SALE_NOT_EDITABLE','فروش فیزیکی در وضعیت قابل ویرایش نیست.');
      const probe=addPhysicalSaleLine(createPhysicalSale({id:saleId,clientCommandId:randomUUID(),staffActorId}),{variantId:line.variant_id,quantity:line.quantity});
      const valid=probe.lines[0];if(!valid)throw new DomainError('POS_LINE_INVALID','ردیف فروش فیزیکی معتبر نیست.');
      const saved=await this.saleRepo.addOrIncreaseLine(ex,{id:randomUUID(),saleId,variantId:valid.variantId,quantity:valid.quantity});
      if(!saved)throw new DomainError('POS_QUANTITY_INVALID','تعداد فروش فیزیکی معتبر نیست.');
      return this.commands.recordLineEffect(ex,{commandId,lineIndex,saleId,variantId:valid.variantId,quantity:valid.quantity});
    });
  }

  private markApplied(commandId:string,sale:any){
    const result={sale_id:String(sale.id),sale_status:String(sale.status),sale_version:Number(sale.version)};
    return this.tx.run(async ex=>{
      const current=await this.commands.byId(ex,commandId,true);
      if(!current)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      if(String(current.status)==='applied')return current;
      if(String(current.status)!=='queued')throw new DomainError('POS_OFFLINE_COMMAND_STATE_CHANGED','وضعیت فرمان آفلاین تغییر کرده است.');
      const saved=await this.commands.markApplied(ex,commandId,result);
      if(!saved)throw new DomainError('POS_OFFLINE_COMMAND_STATE_CHANGED','وضعیت فرمان آفلاین تغییر کرده است.');
      return saved;
    });
  }

  private saleSyncPayload(raw:unknown):SaleSyncPayload{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DomainError('POS_OFFLINE_PAYLOAD_INVALID','payload فرمان آفلاین معتبر نیست.');
    const x=raw as Record<string,unknown>,allowed=new Set(['warehouse_id','customer_type','payment_method','external_reference','lines']);
    if(Object.keys(x).some(k=>!allowed.has(k)))throw new DomainError('POS_OFFLINE_PAYLOAD_FIELD_FORBIDDEN','payload فرمان آفلاین شامل فیلد غیرمجاز است.');
    const warehouse_id=this.uuid(x.warehouse_id,'POS_WAREHOUSE_ID_INVALID');
    const customer_type=String(x.customer_type??'retail') as 'retail'|'wholesale';if(!['retail','wholesale'].includes(customer_type))throw new DomainError('POS_CUSTOMER_TYPE_INVALID','نوع مشتری معتبر نیست.');
    const payment_method=String(x.payment_method??'') as 'cash'|'card';if(!['cash','card'].includes(payment_method))throw new DomainError('POS_PAYMENT_METHOD_INVALID','روش پرداخت معتبر نیست.');
    const external_reference=x.external_reference==null?null:String(x.external_reference).trim();if(external_reference!==null&&(external_reference.length<1||external_reference.length>120))throw new DomainError('POS_PAYMENT_REFERENCE_INVALID','مرجع پرداخت معتبر نیست.');
    if(!Array.isArray(x.lines)||x.lines.length<1||x.lines.length>100)throw new DomainError('POS_OFFLINE_LINES_INVALID','اقلام فرمان آفلاین معتبر نیستند.');
    const aggregate=new Map<string,number>();
    for(const rawLine of x.lines){
      if(!rawLine||typeof rawLine!=='object'||Array.isArray(rawLine))throw new DomainError('POS_OFFLINE_LINE_INVALID','قلم فرمان آفلاین معتبر نیست.');
      const l=rawLine as Record<string,unknown>;if(Object.keys(l).some(k=>!['variant_id','quantity'].includes(k)))throw new DomainError('POS_OFFLINE_LINE_FIELD_FORBIDDEN','قلم فرمان آفلاین شامل فیلد غیرمجاز است.');
      const variant_id=this.uuid(l.variant_id,'POS_VARIANT_ID_INVALID'),quantity=Number(l.quantity);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>999)throw new DomainError('POS_QUANTITY_INVALID','تعداد فروش فیزیکی معتبر نیست.');
      const next=(aggregate.get(variant_id)??0)+quantity;if(next>999)throw new DomainError('POS_QUANTITY_INVALID','مجموع تعداد یک کالا بیش از حد مجاز است.');aggregate.set(variant_id,next);
    }
    const lines=[...aggregate.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([variant_id,quantity])=>({variant_id,quantity}));
    return{warehouse_id,customer_type,payment_method,external_reference,lines};
  }

  private staff(){const actor=this.ctx.get()?.actor;if(actor?.type!=='staff'||!actor.id)throw new DomainError('POS_STAFF_REQUIRED','فرمان آفلاین POS فقط برای کاربر سازمانی مجاز است.');return actor;}
  private uuid(value:unknown,code:string){const v=String(value??'').trim().toLowerCase();if(!UUID_RE.test(v))throw new DomainError(code,'شناسه معتبر نیست.');return v;}
}
