import { DomainError } from '../../../shared/errors/domain-error';
import { ResolvedNotificationRecipient } from '../application/ports/notification-recipient.port';
export type NotificationChannel='sms'|'email'|'in_app';
export class NotificationRoutingPolicy{
 channels(recipient:ResolvedNotificationRecipient,requested?:readonly string[]):NotificationChannel[]{
  if(!recipient.active)throw new DomainError('NOTIFICATION_RECIPIENT_INACTIVE','گیرنده اعلان فعال نیست.');
  const available:NotificationChannel[]=[];if(recipient.mobile)available.push('sms');if(recipient.email)available.push('email');if(recipient.subjectType!=='internal')available.push('in_app');
  const wanted=(requested?.length?requested:available).filter((x):x is NotificationChannel=>['sms','email','in_app'].includes(x));
  const out=[...new Set(wanted.filter(x=>available.includes(x)))];
  if(out.length===0)throw new DomainError('NOTIFICATION_CHANNEL_UNAVAILABLE','هیچ کانال معتبری برای گیرنده در دسترس نیست.');
  return out;
 }
}
