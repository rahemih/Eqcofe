import { Module } from '@nestjs/common';
import { InventoryRepository } from './infrastructure/inventory.repository';
import { InventoryService } from './application/inventory.service';
import { InventoryPosService } from './application/inventory-pos.service';
import { InventoryController } from './presentation/inventory.controller';
import { InventoryCostBasisService } from './application/ports/inventory-cost-basis.service';
import { AllocationTransferService } from './application/allocation-transfer.service';
import { InventoryAvailabilityService } from './application/ports/inventory-availability.service';
import { INVENTORY_AVAILABILITY_PORT, INVENTORY_COST_BASIS_PORT, INVENTORY_RESERVATION_PORT } from './application/ports/inventory-public.port';
import { INVENTORY_PROCUREMENT_PORT } from './application/ports/inventory-procurement.port';
import { InventoryProcurementService } from './application/ports/inventory-procurement.service';
import { INVENTORY_FULFILLMENT_PORT } from './application/ports/inventory-fulfillment.port';
import { InventoryFulfillmentService } from './application/ports/inventory-fulfillment.service';
import { INVENTORY_AFTER_SALES_PORT } from './application/ports/inventory-after-sales.port';
import { InventoryAfterSalesService } from './application/ports/inventory-after-sales.service';
import { INVENTORY_FINANCE_PORT } from './application/ports/inventory-finance.port';
import { InventoryFinanceService } from './application/ports/inventory-finance.service';
@Module({
  controllers:[InventoryController],
  providers:[
    InventoryRepository,InventoryService,InventoryPosService,InventoryCostBasisService,AllocationTransferService,InventoryAvailabilityService,InventoryProcurementService,InventoryFulfillmentService,InventoryAfterSalesService,InventoryFinanceService,
    {provide:INVENTORY_AVAILABILITY_PORT,useExisting:InventoryAvailabilityService},
    {provide:INVENTORY_COST_BASIS_PORT,useExisting:InventoryCostBasisService},
    {provide:INVENTORY_RESERVATION_PORT,useExisting:InventoryService},
    {provide:INVENTORY_PROCUREMENT_PORT,useExisting:InventoryProcurementService},
    {provide:INVENTORY_FULFILLMENT_PORT,useExisting:InventoryFulfillmentService},
    {provide:INVENTORY_AFTER_SALES_PORT,useExisting:InventoryAfterSalesService},
    {provide:INVENTORY_FINANCE_PORT,useExisting:InventoryFinanceService},
  ],
  exports:[InventoryService,InventoryPosService,AllocationTransferService,INVENTORY_AVAILABILITY_PORT,INVENTORY_COST_BASIS_PORT,INVENTORY_RESERVATION_PORT,INVENTORY_PROCUREMENT_PORT,INVENTORY_FULFILLMENT_PORT,INVENTORY_AFTER_SALES_PORT,INVENTORY_FINANCE_PORT],
}) export class InventoryModule{}
