import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminModule } from '../admin/admin.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { DomainNotificationConsumer } from './application/domain-notification.consumer';
import { NotificationTemplateRepository } from './infrastructure/notification-template.repository';
import { NotificationTemplateRenderer } from './domain/notification-template.renderer';
import { NotificationTemplateService } from './application/notification-template.service';
import { NotificationRepository } from './infrastructure/notification.repository';
import { NotificationRecipientAdapter } from './infrastructure/notification-recipient.adapter';
import { NOTIFICATION_RECIPIENT_PORT } from './application/ports/notification-recipient.port';
import { NotificationRoutingPolicy } from './domain/notification-routing.policy';
import { NotificationCommandService } from './application/notification-command.service';
import { NotificationInAppService } from './application/notification-in-app.service';
import { NotificationProviderRegistry } from './infrastructure/notification-provider.registry';
import { NotificationDeliveryRepository } from './infrastructure/notification-delivery.repository';
import { NotificationRetryPolicy } from './domain/notification-retry.policy';
import { NotificationDeliveryService } from './application/notification-delivery.service';
import { NotificationOperationsService } from './application/notification-operations.service';
import { NotificationAdminService } from './application/notification-admin.service';
import { NotificationsController } from './presentation/notifications.controller';
@Module({controllers:[NotificationsController],imports:[CustomerModule,ConfigurationModule,OrdersModule,AdminModule],providers:[DomainNotificationConsumer,NotificationTemplateRepository,NotificationTemplateRenderer,NotificationTemplateService,NotificationRepository,NotificationRecipientAdapter,{provide:NOTIFICATION_RECIPIENT_PORT,useExisting:NotificationRecipientAdapter},NotificationRoutingPolicy,NotificationCommandService,NotificationInAppService,NotificationProviderRegistry,NotificationDeliveryRepository,NotificationRetryPolicy,NotificationDeliveryService,NotificationOperationsService,NotificationAdminService],exports:[NotificationTemplateService,NotificationCommandService,NotificationInAppService,NotificationProviderRegistry,NotificationDeliveryService,NotificationOperationsService]})
export class NotificationsModule {}
