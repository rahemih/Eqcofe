import { Injectable } from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { CustomerNotificationRecipientPort } from '../application/ports/customer-notification-recipient.port';
@Injectable()
export class CustomerNotificationRecipientAdapter implements CustomerNotificationRecipientPort{
  constructor(private readonly repo:CustomerRepository){}
  async resolve(customerId:string){const p=await this.repo.profileById(customerId);if(!p)return null;return{customerId:p.id,active:p.status==='active',mobile:p.mobile_normalized,email:p.email_normalized};}
}
