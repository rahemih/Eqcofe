import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const ORDER_NOTIFICATION_CONTEXT_PORT=Symbol('ORDER_NOTIFICATION_CONTEXT_PORT');
export interface OrderNotificationContext { orderId:string; orderNumber:string; customerId:string|null; }
export interface OrderNotificationContextPort { byOrderId(ex:DatabaseExecutor,orderId:string):Promise<OrderNotificationContext|null>; }
