import { DomainError } from '../../../shared/errors/domain-error';

export type PhysicalSaleStatus = 'draft' | 'voided';

export interface PhysicalSaleLine {
  variantId: string;
  quantity: number;
}

export interface PhysicalSale {
  id: string;
  clientCommandId: string;
  staffActorId: string;
  status: PhysicalSaleStatus;
  lines: readonly PhysicalSaleLine[];
  version: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createPhysicalSale(input: { id: unknown; clientCommandId: unknown; staffActorId: unknown }): PhysicalSale {
  return {
    id: uuid(input.id, 'POS_SALE_ID_INVALID'),
    clientCommandId: uuid(input.clientCommandId, 'POS_CLIENT_COMMAND_ID_INVALID'),
    staffActorId: uuid(input.staffActorId, 'POS_STAFF_ACTOR_ID_INVALID'),
    status: 'draft',
    lines: [],
    version: 1,
  };
}

export function addPhysicalSaleLine(sale: PhysicalSale, input: { variantId: unknown; quantity: unknown }): PhysicalSale {
  if (sale.status !== 'draft') throw new DomainError('POS_SALE_NOT_EDITABLE', 'فروش فیزیکی در وضعیت قابل ویرایش نیست.');
  const variantId = uuid(input.variantId, 'POS_VARIANT_ID_INVALID');
  const quantity = Number(input.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
    throw new DomainError('POS_QUANTITY_INVALID', 'تعداد فروش فیزیکی معتبر نیست.');
  }
  const existing = sale.lines.find((line) => line.variantId === variantId);
  const lines = existing
    ? sale.lines.map((line) => line.variantId === variantId ? { ...line, quantity: boundedQuantity(line.quantity + quantity) } : line)
    : [...sale.lines, { variantId, quantity }];
  return { ...sale, lines, version: sale.version + 1 };
}

export function voidPhysicalSale(sale: PhysicalSale): PhysicalSale {
  if (sale.status === 'voided') return sale;
  if (sale.status !== 'draft') throw new DomainError('POS_SALE_VOID_INVALID', 'فروش فیزیکی در این وضعیت قابل ابطال نیست.');
  return { ...sale, status: 'voided', version: sale.version + 1 };
}

function boundedQuantity(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 999) throw new DomainError('POS_QUANTITY_INVALID', 'تعداد فروش فیزیکی معتبر نیست.');
  return value;
}

function uuid(value: unknown, code: string): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!UUID_RE.test(normalized)) throw new DomainError(code, 'شناسه فروش فیزیکی معتبر نیست.');
  return normalized;
}
