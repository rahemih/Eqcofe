import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../../src/modules/inventory/application/inventory.service';
import { CartService } from '../../src/modules/cart/application/cart.service';
import { PaymentService } from '../../src/modules/payments/application/payment.service';
import { NotificationOperationsService } from '../../src/modules/notifications/application/notification-operations.service';
import { OrderService } from '../../src/modules/orders/application/order.service';
import { ArticleOperationsService } from '../../src/modules/content/application/article-operations.service';
import { StructuredLogger } from '../../src/platform/observability/structured-logger';

@Injectable()
export class SchedulerTasksService {
  constructor(private readonly inventory: InventoryService,private readonly cart:CartService,private readonly orders:OrderService,private readonly payments:PaymentService,private readonly notifications:NotificationOperationsService,private readonly content:ArticleOperationsService,private readonly logger:StructuredLogger) {}
  @Cron(CronExpression.EVERY_MINUTE)
  async expireCommerceCommitments(): Promise<void> {
    const tasks:[string,()=>Promise<unknown>][]=[
      ['cart-expiry',()=>this.cart.expireCartsDue(250)],
      ['checkout-expiry',()=>this.cart.expireDue(250)],
      ['order-expiry',()=>this.orders.expireDue(250)],
      ['inventory-expiry',()=>this.inventory.expireDue(250)],
    ];
    const results=await Promise.allSettled(tasks.map(([,run])=>run()));
    results.forEach((result,index)=>{if(result.status==='rejected')this.logger.error(`scheduler cleanup failed: ${tasks[index]?.[0]??'unknown'}`);});
  }
  @Cron(CronExpression.EVERY_MINUTE) async recoverNotificationDeliveries(): Promise<void> { await this.notifications.recoverStale(50); }
  @Cron(CronExpression.EVERY_MINUTE) async publishScheduledContent(): Promise<void> { await this.content.publishDue(50); }
  @Cron(CronExpression.EVERY_10_MINUTES) async runPaymentReconciliation(): Promise<void> { await this.payments.reconcileDue(100); }
}
