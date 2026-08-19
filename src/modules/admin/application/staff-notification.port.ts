import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
export const STAFF_NOTIFICATION_PORT=Symbol('STAFF_NOTIFICATION_PORT');
export interface StaffNotificationRecipient {staffId:string;active:boolean;mobile:string|null;email:string|null;}
export interface StaffNotificationPort{
 resolve(staffId:string):Promise<StaffNotificationRecipient|null>;
 activeWithPermission(ex:DatabaseExecutor,permissionKey:string):Promise<string[]>;
}
