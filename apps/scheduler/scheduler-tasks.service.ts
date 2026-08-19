import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../../src/modules/inventory/application/inventory.service';
import { CartService } from '../../src/modules/cart/application/cart.service';
import { PaymentService } from '../../src/modules/payments/application/payment.service';
import { NotificationOperationsService } from '../../src/modules/notifications/application/notification-operations.service';
import { OrderService } from '../../src/modules/orders/application/order.service';

@Injectable()
export class SchedulerTasksService {
  constructor(private readonly inventory: InventoryService,private readonly cart:CartService,private readonly orders:OrderService,private readonly payments:PaymentService,private readonly notifications:NotificationOperationsService) {}
  @Cron(CronExpression.EVERY_MINUTE)
  async expireCommerceCommitments(): Promise<void> {
    await this.cart.expireCartsDue(250);
    await this.cart.expireDue(250);
    await this.orders.expireDue(250);
    await this.inventory.expireDue(250);
  }
  @Cron(CronExpression.EVERY_MINUTE) async recoverNotificationDeliveries(): Promise<void> { await this.notifications.recoverStale(50); }
  @Cron(CronExpression.EVERY_10_MINUTES) refreshCurrencyRates(): void { /* Pricing/Integrations workflow follows its own integration step. */ }
  @Cron(CronExpression.EVERY_10_MINUTES) async runPaymentReconciliation(): Promise<void> { await this.payments.reconcileDue(100); }
  @Cron(CronExpression.EVERY_DAY_AT_2AM) evaluateProductArchiveEligibility(): void { /* Catalog archive workflow follows its own step. */ }
}
