import { Inject,Injectable } from '@nestjs/common';
import { CUSTOMER_NOTIFICATION_RECIPIENT_PORT,CustomerNotificationRecipientPort } from '../../customer/application/ports/customer-notification-recipient.port';
import { STAFF_NOTIFICATION_PORT,StaffNotificationPort } from '../../admin/application/staff-notification.port';
import { NotificationRecipientPort,NotificationSubjectType } from '../application/ports/notification-recipient.port';
@Injectable()
export class NotificationRecipientAdapter implements NotificationRecipientPort{
 constructor(@Inject(CUSTOMER_NOTIFICATION_RECIPIENT_PORT)private readonly customers:CustomerNotificationRecipientPort,@Inject(STAFF_NOTIFICATION_PORT)private readonly staff:StaffNotificationPort){}
 async resolve(type:NotificationSubjectType,id:string){
  if(type==='customer'){const r=await this.customers.resolve(id);if(!r)return null;return{subjectType:'customer' as const,subjectId:r.customerId,active:r.active,mobile:r.mobile,email:r.email};}
  if(type==='staff'){const r=await this.staff.resolve(id);if(!r)return null;return{subjectType:'staff' as const,subjectId:r.staffId,active:r.active,mobile:r.mobile,email:r.email};}
  return null;
 }
}
