import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { createPhysicalSale, addPhysicalSaleLine } from '../domain/physical-sale';
import { PhysicalSaleRepository } from '../infrastructure/physical-sale.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PhysicalSaleService {
  constructor(private readonly tx: TransactionManager, private readonly repo: PhysicalSaleRepository) {}

  async createDraft(input: { clientCommandId: unknown; staffActorId: unknown }) {
    const sale = createPhysicalSale({ id: randomUUID(), clientCommandId: input.clientCommandId, staffActorId: input.staffActorId });
    return this.tx.run(async (ex) => {
      const created = await this.repo.create(ex, sale);
      if (created) return created;
      const replay = await this.repo.byClientCommandId(sale.clientCommandId, ex, true);
      if (!replay || replay.staff_actor_id !== sale.staffActorId) {
        throw new DomainError('POS_IDEMPOTENCY_CONFLICT', 'کلید تکرار فروش فیزیکی با درخواست دیگری استفاده شده است.');
      }
      return replay;
    });
  }

  async addLine(input: { saleId: unknown; staffActorId: unknown; variantId: unknown; quantity: unknown }) {
    const saleId = this.uuid(input.saleId, 'POS_SALE_ID_INVALID');
    const staffActorId = this.uuid(input.staffActorId, 'POS_STAFF_ACTOR_ID_INVALID');
    const probe = addPhysicalSaleLine(createPhysicalSale({ id: saleId, clientCommandId: randomUUID(), staffActorId }), { variantId: input.variantId, quantity: input.quantity });
    const line = probe.lines[0];
    if (!line) throw new DomainError('POS_LINE_INVALID', 'ردیف فروش فیزیکی معتبر نیست.');
    return this.tx.run(async (ex) => {
      const sale = await this.repo.byId(saleId, ex, true);
      if (!sale || sale.staff_actor_id !== staffActorId) throw new DomainError('POS_SALE_NOT_FOUND', 'فروش فیزیکی پیدا نشد.');
      if (sale.status !== 'draft') throw new DomainError('POS_SALE_NOT_EDITABLE', 'فروش فیزیکی در وضعیت قابل ویرایش نیست.');
      const saved = await this.repo.addOrIncreaseLine(ex, { id: randomUUID(), saleId, variantId: line.variantId, quantity: line.quantity });
      if (!saved) throw new DomainError('POS_QUANTITY_INVALID', 'تعداد فروش فیزیکی معتبر نیست.');
      return saved;
    });
  }

  private uuid(value: unknown, code: string) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!UUID_RE.test(normalized)) throw new DomainError(code, 'شناسه فروش فیزیکی معتبر نیست.');
    return normalized;
  }
}
