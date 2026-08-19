import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const INVENTORY_FINANCE_PORT=Symbol('INVENTORY_FINANCE_PORT');
export interface InventoryFinanceCogsSnapshot{grossCogsToman:number;returnedCogsToman:number;netCogsToman:number;consumptionCount:number;returnLayerCount:number;}
export interface InventoryFinancePort{cogsForOrder(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<InventoryFinanceCogsSnapshot>;}
