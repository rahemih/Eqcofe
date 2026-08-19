import { Module } from '@nestjs/common';
import { WorkerPlatformModule } from '../../src/platform/worker-platform.module';
import { OutboxPublisherService } from './outbox-publisher.service';
import { DomainEventsProcessor } from './domain-events.processor';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { NotificationDeliveryWorkerService } from './notification-delivery-worker.service';
import { FinanceModule } from '../../src/modules/finance/finance.module';
@Module({ imports: [WorkerPlatformModule,NotificationsModule,FinanceModule], providers: [OutboxPublisherService, DomainEventsProcessor, NotificationDeliveryWorkerService] })
export class WorkerAppModule {}
