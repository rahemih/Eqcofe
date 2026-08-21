import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { createPhysicalSale, addPhysicalSaleLine } from '../domain/physical-sale';
import { PhysicalSaleRepository } from '../infrastructure/physical-sale.repository';

@Injectable()
export class PhysicalSaleService {
  constructor(private readonly tx: TransactionManager, private readonly repo: PhysicalSaleRepository) {}

  async createDraft(input: { clientCommandId: unknown; staffActorId: unknown }) {
    const sale = createPhysicalSale({ id: randomUUID(), clientCommandId: input.clientCommandId, staffActorId: input.staffActorId });
    return this.tx.execute(async (ex) => {
      const created = await this.repo.create(ex, sale);
      if (created) return created;
      const replay = await this.repo.byClientCommandId(sale.clientCommandId, ex, true);
      if (!replay || replay.staff_actor_id !== sale.staffActorId) {
        throw new DomainError('POS_IDEMPOTENCY_CONFLICT', 'کلید تکرار فروش فیزیکی با درخواست دیگری استفاده شده است.');
      }
      return replay;
    });
  }

  async addLine(input: { saleId: unknown; clientCommandId: unknown; staffActorId: unknown; variantId: unknown; quantity: unknown }) {
    const probe = createPhysicalSale({ id: input.saleId, clientCommandId: input.clientCommandId, staffActorId: input.staffActorId });
    const domain = addPhysicalSaleLine(probe, { variantId: input.variantId, quantity: input.quantity });
    const line = domain.lines[0];
    return this.tx.execute(async (ex) => {
      const sale = await this.repo.byClientCommandId(probe.clientCommandId, ex, true);
      if (!sale || sale.id !== probe.id || sale.staff_actor_id !== probe.staffActorId) {
        throw new DomainError('POS_SALE_NOT_FOUND', 'فروش فیزیکی پیدا نشد.');
      }
      if (sale.status !== 'draft') throw new DomainError('POS_SALE_NOT_EDITABLE', 'فروش فیزیکی در وضعیت قابل ویرایش نیست.');
      const saved = await this.repo.addOrIncreaseLine(ex, { id: randomUUID(), saleId: sale.id, variantId: line.variantId, quantity: line.quantity });
      if (!saved) throw new DomainError('POS_QUANTITY_INVALID', 'تعداد فروش فیزیکی معتبر نیست.');
      return saved;
    });
  }
}
