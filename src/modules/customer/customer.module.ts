import { Module } from '@nestjs/common';
import { CustomerProfileService } from './application/customer-profile.service';
import { CustomerAddressService } from './application/customer-address.service';
import { CustomerWishlistService } from './application/customer-wishlist.service';
import { CustomerWholesaleService } from './application/customer-wholesale.service';
import { CatalogModule } from '../catalog/catalog.module';
import { CustomerRepository } from './infrastructure/customer.repository';
import { CustomerWholesaleRepository } from './infrastructure/customer-wholesale.repository';
import { CUSTOMER_COMMERCE_PORT } from './application/ports/customer-commerce.port';
import { CustomerCommerceAdapter } from './infrastructure/customer-commerce.adapter';
import { CustomerController,CustomerWholesaleAdminController } from './presentation/customer.controller';
import { CUSTOMER_NOTIFICATION_RECIPIENT_PORT } from './application/ports/customer-notification-recipient.port';
import { CustomerNotificationRecipientAdapter } from './infrastructure/customer-notification-recipient.adapter';

@Module({
  imports:[CatalogModule],
  controllers:[CustomerController,CustomerWholesaleAdminController],
  providers:[CustomerRepository,CustomerWholesaleRepository,CustomerCommerceAdapter,CustomerNotificationRecipientAdapter,CustomerProfileService,CustomerAddressService,CustomerWishlistService,CustomerWholesaleService,{provide:CUSTOMER_COMMERCE_PORT,useExisting:CustomerCommerceAdapter},{provide:CUSTOMER_NOTIFICATION_RECIPIENT_PORT,useExisting:CustomerNotificationRecipientAdapter}],
  exports:[CustomerRepository,CustomerWholesaleRepository,CustomerProfileService,CustomerAddressService,CustomerWishlistService,CustomerWholesaleService,CUSTOMER_COMMERCE_PORT,CUSTOMER_NOTIFICATION_RECIPIENT_PORT],
})
export class CustomerModule {}
