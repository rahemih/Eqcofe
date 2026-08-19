import { Injectable,OnApplicationBootstrap,OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDeliveryService } from '../../src/modules/notifications/application/notification-delivery.service';
import { StructuredLogger } from '../../src/platform/observability/structured-logger';
@Injectable()
export class NotificationDeliveryWorkerService implements OnApplicationBootstrap,OnApplicationShutdown{
 private stopping=false;
 constructor(private readonly delivery:NotificationDeliveryService,private readonly env:ConfigService,private readonly logger:StructuredLogger){}
 onApplicationBootstrap(){void this.loop();}
 onApplicationShutdown(){this.stopping=true;}
 private async loop(){const poll=Math.max(100,Number(this.env.get('NOTIFICATION_POLL_INTERVAL_MS',500))),batch=Math.min(Math.max(Number(this.env.get('NOTIFICATION_BATCH_SIZE',25)),1),100);while(!this.stopping){try{const rows=await this.delivery.processBatch(batch);if(rows.length)this.logger.log(`notification delivery batch: ${rows.length}`);}catch(e:any){this.logger.error(`notification delivery tick failed: ${e?.name??'UNKNOWN_ERROR'}`);}await new Promise(r=>setTimeout(r,poll));}}
}
