import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerPlatformModule } from '../../src/platform/scheduler-platform.module';
import { CartModule } from '../../src/modules/cart/cart.module';
import { OrdersModule } from '../../src/modules/orders/orders.module';
import { InventoryModule } from '../../src/modules/inventory/inventory.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { PaymentsModule } from '../../src/modules/payments/payments.module';
import { ContentModule } from '../../src/modules/content/content.module';
import { SchedulerTasksService } from './scheduler-tasks.service';
@Module({ imports: [ScheduleModule.forRoot(), SchedulerPlatformModule, InventoryModule, CartModule, OrdersModule, PaymentsModule, NotificationsModule, ContentModule], providers: [SchedulerTasksService] })
export class SchedulerAppModule {}
