import { Injectable } from '@nestjs/common';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { OfflineCommandSyncService } from './offline-command-sync.service';
import { PhysicalSaleCommitService } from './physical-sale-commit.service';
import { PhysicalSaleService } from './physical-sale.service';
import { PosPricingSnapshotService } from './pos-pricing-snapshot.service';
import { PosScanResolutionService } from './pos-scan-resolution.service';

@Injectable()
export class PosOperationsService {
  constructor(
    private readonly sales:PhysicalSaleService,
    private readonly pricing:PosPricingSnapshotService,
    private readonly commitService:PhysicalSaleCommitService,
    private readonly scanService:PosScanResolutionService,
    private readonly offline:OfflineCommandSyncService,
    private readonly audit:AuditWriter,
    private readonly ctx:RequestContextStore,
  ){}

  resolveScan(kind:'sku'|'barcode',value:unknown){this.staff();return this.scanService.resolve({kind,value});}

  async createSale(clientCommandId:unknown){const actor=this.staff();const result=await this.sales.createDraft({clientCommandId,staffActorId:actor.id});await this.record('pos.sale.create','pos.physical_sale',String(result.id),{status:result.status});return result;}
  async addLine(saleId:unknown,variantId:unknown,quantity:unknown){const actor=this.staff();const result=await this.sales.addLine({saleId,staffActorId:actor.id,variantId,quantity});await this.record('pos.sale.line.add','pos.physical_sale',String(saleId),{variant_id:result.variant_id,quantity:result.quantity});return result;}
  async priceSale(saleId:unknown,customerType:'retail'|'wholesale'='retail'){const actor=this.staff();const result=await this.pricing.priceDraft({saleId,staffActorId:actor.id,customerType});await this.record('pos.sale.price','pos.physical_sale',String(result.sale_id),{customer_type:result.customer_type,total_toman:result.total_toman});return result;}
  async commitSale(input:{saleId:unknown;warehouseId:unknown;expectedVersion:unknown;paymentMethod:'cash'|'card';externalReference?:unknown}){const actor=this.staff();const result=await this.commitService.commit({saleId:input.saleId,warehouseId:input.warehouseId,expectedVersion:Number(input.expectedVersion),paymentMethod:input.paymentMethod,externalReference:input.externalReference==null?undefined:String(input.externalReference)});await this.record('pos.sale.commit','pos.physical_sale',String(result.id),{status:result.status,total_toman:result.total_toman,payment_receipt_id:result.payment_receipt_id,actor_id:actor.id});return result;}
  async captureOffline(clientCommandId:unknown,body:any){this.staff();const result=await this.offline.capture({clientCommandId,commandType:'sale.sync',payload:body});await this.record('pos.offline.capture','pos.offline_command',String(result.id),{status:result.status,client_command_id:result.client_command_id});return result;}
  async syncOffline(clientCommandId:unknown){this.staff();const result=await this.offline.sync(clientCommandId);await this.record('pos.offline.sync','pos.offline_command',String(result.id),{status:result.status,recovery_count:result.recovery_count});return result;}

  private async record(action:string,resourceType:string,resourceId:string,afterData:unknown){const actor=this.staff();const c=this.ctx.get();await this.audit.write({actorType:'staff',actorId:actor.id,action,resourceType,resourceId,afterData,requestId:c?.requestId,traceId:c?.correlationId});}
  private staff(){const actor=this.ctx.get()?.actor;if(actor?.type!=='staff'||!actor.id)throw new DomainError('POS_STAFF_REQUIRED','عملیات POS فقط برای کاربر سازمانی مجاز است.');return actor;}
}
