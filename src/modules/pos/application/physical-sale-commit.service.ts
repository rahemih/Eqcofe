import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { InventoryPosService } from '../../inventory/application/inventory-pos.service';
import { PhysicalSalePaymentMethod, PhysicalSalePaymentService } from '../../payments/application/physical-sale-payment.service';
import { PhysicalSaleRepository } from '../infrastructure/physical-sale.repository';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PhysicalSaleCommitService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repo: PhysicalSaleRepository,
    private readonly inventory: InventoryPosService,
    private readonly payments: PhysicalSalePaymentService,
    private readonly outbox: OutboxWriter,
    private readonly ctx: RequestContextStore,
  ) {}

  commit(input:{saleId:unknown;warehouseId:unknown;expectedVersion:unknown;paymentMethod:unknown;externalReference?:unknown}){
    const saleId=this.uuid(input.saleId,'POS_SALE_ID_INVALID');
    const warehouseId=this.uuid(input.warehouseId,'POS_WAREHOUSE_ID_INVALID');
    const expectedVersion=Number(input.expectedVersion);
    if(!Number.isSafeInteger(expectedVersion)||expectedVersion<=0)throw new DomainError('POS_SALE_VERSION_INVALID','نسخه فروش حضوری معتبر نیست.');
    const paymentMethod=String(input.paymentMethod??'') as PhysicalSalePaymentMethod;
    if(!['cash','card'].includes(paymentMethod))throw new DomainError('POS_PAYMENT_METHOD_INVALID','روش پرداخت فروش حضوری معتبر نیست.');
    const externalReference=input.externalReference==null?null:String(input.externalReference).trim();
    if(externalReference!==null&&(externalReference.length<1||externalReference.length>120))throw new DomainError('POS_PAYMENT_REFERENCE_INVALID','مرجع پرداخت فروش حضوری معتبر نیست.');
    const actor=this.ctx.get()?.actor;
    if(actor?.type!=='staff')throw new DomainError('POS_STAFF_REQUIRED','ثبت نهایی فروش حضوری فقط برای کاربر سازمانی مجاز است.');

    return this.tx.run(async ex=>{
      const sale=await this.repo.byId(saleId,ex,true);
      if(!sale)throw new DomainError('POS_SALE_NOT_FOUND','فروش حضوری پیدا نشد.');
      if(String(sale.staff_actor_id)!==actor.id)throw new DomainError('POS_SALE_ACTOR_MISMATCH','فروش حضوری متعلق به کاربر فعلی نیست.');
      if(String(sale.status)==='committed')return sale;
      if(String(sale.status)!=='draft')throw new DomainError('POS_SALE_NOT_COMMITTABLE','فروش حضوری در وضعیت قابل ثبت نهایی نیست.');
      if(Number(sale.version)!==expectedVersion)throw new DomainError('POS_SALE_VERSION_CONFLICT','نسخه فروش حضوری تغییر کرده است.');
      const total=Number(sale.total_toman);
      if(!Number.isSafeInteger(total)||total<=0)throw new DomainError('POS_SALE_PRICE_SNAPSHOT_REQUIRED','فروش حضوری باید قبل از ثبت نهایی قیمت‌گذاری شود.');

      const lines=await this.repo.linesForUpdate(ex,saleId);
      if(!lines.length)throw new DomainError('POS_SALE_EMPTY','فروش حضوری بدون قلم قابل ثبت نیست.');
      for(const line of lines){
        if(line.priced_at==null||!Number.isSafeInteger(Number(line.unit_price_toman))||Number(line.unit_price_toman)<0){
          throw new DomainError('POS_SALE_PRICE_SNAPSHOT_REQUIRED','تمام اقلام فروش حضوری باید snapshot قیمت معتبر داشته باشند.');
        }
      }

      const receipt=await this.payments.confirmInTransaction(ex,{saleId,amountToman:total,paymentMethod,externalReference,confirmedBy:actor.id});
      let totalCost=0;
      const movementIds:string[]=[];
      for(const line of lines){
        const consumed=await this.inventory.consumePhysicalSaleInTransaction(ex,{warehouseId,variantId:String(line.variant_id),quantity:Number(line.quantity),saleReferenceId:saleId,staffActorId:actor.id});
        totalCost+=Number(consumed.total_cost_toman);
        movementIds.push(...consumed.movement_ids);
        if(!Number.isSafeInteger(totalCost)||totalCost<0)throw new DomainError('POS_SALE_COST_INVALID','هزینه فروش حضوری معتبر نیست.');
      }

      const committed=await this.repo.commitDraft(ex,{saleId,expectedVersion,warehouseId,paymentReceiptId:String(receipt.id),totalCostToman:totalCost});
      if(!committed)throw new DomainError('POS_SALE_COMMIT_CONFLICT','ثبت نهایی فروش حضوری به دلیل تغییر هم‌زمان ناموفق بود.');
      const context=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};
      await this.outbox.append(ex,[{eventType:'pos.sale.committed.v1',eventVersion:1,aggregateType:'physical_sale',aggregateId:saleId,aggregateVersion:Number(committed.version),occurredAt:new Date(),payload:{sale_id:saleId,warehouse_id:warehouseId,payment_receipt_id:String(receipt.id),payment_method:paymentMethod,revenue_toman:total,cogs_toman:totalCost,movement_ids:movementIds}}],context);
      return committed;
    });
  }

  private uuid(value:unknown,code:string){const v=String(value??'').trim().toLowerCase();if(!UUID_RE.test(v))throw new DomainError(code,'شناسه فروش حضوری معتبر نیست.');return v;}
}
