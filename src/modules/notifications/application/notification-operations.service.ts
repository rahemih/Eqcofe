import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { StructuredLogger } from '../../../platform/observability/structured-logger';
import { NotificationDeliveryRepository } from '../infrastructure/notification-delivery.repository';
@Injectable()
export class NotificationOperationsService{
 constructor(private readonly tx:TransactionManager,private readonly repo:NotificationDeliveryRepository,private readonly env:ConfigService,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter,private readonly logger:StructuredLogger){}
 private timeoutMs(){return Math.max(30_000,Number(this.env.get('NOTIFICATION_PROCESSING_TIMEOUT_MS',300_000)));}
 async recoverStale(limit=50){const cutoff=new Date(Date.now()-this.timeoutMs());const rows=await this.tx.run(async ex=>{const r=await this.repo.recoverStaleProcessing(ex,cutoff,limit);if(r.length){const c=this.ctx.get();await this.audit.writeWith(ex,{actorType:'system',action:'notifications.stale_recovery',resourceType:'notification_delivery_batch',resourceId:`batch:${Date.now()}`,afterData:{count:r.length,delivery_ids:r.map((x:any)=>x.id)},requestId:c?.requestId??`notification-recovery-${Date.now()}`,traceId:c?.traceId});}return r;});if(rows.length)this.logger.warn(`notification stale recovery: ${rows.length}`);return{recovered:rows.length};}
 summary(){return this.repo.operationsSummary(new Date(Date.now()-this.timeoutMs()));}
}
