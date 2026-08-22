import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager, DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { physicalAvailable, consumeFifo, weightedCost } from '../domain/inventory.math';
import { InventoryRepository } from '../infrastructure/inventory.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PhysicalSaleInventoryConsumptionInput {
  warehouseId: unknown;
  variantId: unknown;
  quantity: unknown;
  saleReferenceId: unknown;
  staffActorId: unknown;
}

@Injectable()
export class InventoryPosService {
  constructor(private readonly tx: TransactionManager, private readonly repo: InventoryRepository) {}

  consumePhysicalSale(input: PhysicalSaleInventoryConsumptionInput) {
    return this.tx.run((ex) => this.consumePhysicalSaleInTransaction(ex, input));
  }

  async consumePhysicalSaleInTransaction(ex: DatabaseExecutor, input: PhysicalSaleInventoryConsumptionInput) {
    const warehouseId = this.uuid(input.warehouseId, 'POS_WAREHOUSE_ID_INVALID');
    const variantId = this.uuid(input.variantId, 'POS_VARIANT_ID_INVALID');
    const saleReferenceId = this.uuid(input.saleReferenceId, 'POS_SALE_REFERENCE_INVALID');
    const staffActorId = this.uuid(input.staffActorId, 'POS_STAFF_ACTOR_ID_INVALID');
    const quantity = Number(input.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 999) {
      throw new DomainError('POS_INVENTORY_QUANTITY_INVALID', 'تعداد خروج فروش حضوری معتبر نیست.');
    }

    const balance = await this.repo.lockBalance(ex, warehouseId, variantId);
    const available = physicalAvailable({
      onHand: Number(balance.on_hand),
      reserved: Number(balance.reserved),
      allocated: Number(balance.allocated),
      damaged: Number(balance.damaged),
      quarantine: Number(balance.quarantine),
    });
    if (available < quantity) {
      throw new DomainError('POS_INSUFFICIENT_PHYSICAL_STOCK', 'موجودی آزاد فروش حضوری کافی نیست.', {
        variant_id: variantId,
        available,
      });
    }

    const layers = await this.repo.fifoLayers(ex, warehouseId, variantId, 'sellable');
    let parts: { layerId: string; quantity: number; unitCostToman: number }[];
    try {
      parts = consumeFifo(
        layers.map((row: any) => ({
          id: String(row.id),
          remainingQuantity: Number(row.remaining_quantity),
          effectiveUnitCostToman: Number(row.effective_unit_cost_toman),
          receivedAt: row.received_at,
        })),
        quantity,
      );
    } catch {
      throw new DomainError('POS_INVENTORY_COST_LINEAGE_INSUFFICIENT', 'لایه هزینه کافی برای خروج فروش حضوری وجود ندارد.');
    }

    const movementIds: string[] = [];
    for (const part of parts) {
      await this.repo.consumeLayer(ex, part.layerId, part.quantity);
      const movementId = randomUUID();
      movementIds.push(movementId);
      await this.repo.movement(ex, {
        id: movementId,
        warehouseId,
        variantId,
        type: 'pos_sale',
        quantityDelta: -part.quantity,
        costLayerId: part.layerId,
        reasonCode: `pos_sale:${saleReferenceId}`,
        createdBy: staffActorId,
      });
      await this.repo.insertCostConsumption(ex, {
        id: randomUUID(),
        costLayerId: part.layerId,
        movementId,
        quantity: part.quantity,
        unitCostToman: part.unitCostToman,
      });
    }

    await this.repo.updateBalance(ex, warehouseId, variantId, { onHand: -quantity });
    return {
      warehouse_id: warehouseId,
      variant_id: variantId,
      quantity,
      movement_ids: movementIds,
      weighted_unit_cost_toman: weightedCost(parts),
      total_cost_toman: parts.reduce((sum, part) => sum + part.quantity * part.unitCostToman, 0),
    };
  }

  private uuid(value: unknown, code: string) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!UUID_RE.test(normalized)) throw new DomainError(code, 'شناسه موجودی فروش حضوری معتبر نیست.');
    return normalized;
  }
}
