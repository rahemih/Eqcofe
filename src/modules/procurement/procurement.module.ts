import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { ProcurementRepository } from './infrastructure/procurement.repository';
import { SupplierService } from './application/supplier.service';
import { PurchaseService } from './application/purchase.service';
import { ReceiptCostService } from './application/receipt-cost.service';
import { PurchaseReturnService } from './application/purchase-return.service';
import { ProcurementController } from './presentation/procurement.controller';
@Module({imports:[InventoryModule],controllers:[ProcurementController],providers:[ProcurementRepository,SupplierService,PurchaseService,ReceiptCostService,PurchaseReturnService],exports:[SupplierService,PurchaseService,ReceiptCostService]})
export class ProcurementModule{}
