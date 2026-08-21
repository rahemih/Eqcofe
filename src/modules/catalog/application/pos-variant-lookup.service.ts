import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PosVariantLookupRepository } from '../infrastructure/pos-variant-lookup.repository';

export type PosVariantLookupKind = 'sku' | 'barcode';

export interface PosVariantLookupResult {
  variantId: string;
  productId: string;
  sku: string;
  barcode: string | null;
}

@Injectable()
export class PosVariantLookupService {
  constructor(private readonly repo: PosVariantLookupRepository) {}

  async resolve(input: { kind: PosVariantLookupKind; value: unknown }): Promise<PosVariantLookupResult> {
    const value = this.normalize(input.kind, input.value);
    const rows = input.kind === 'sku' ? await this.repo.bySku(value) : await this.repo.byBarcode(value);
    if (rows.length === 0) throw new DomainError('POS_SCAN_NOT_FOUND', 'کالای متناظر با شناسه اسکن‌شده پیدا نشد.');
    if (rows.length !== 1) throw new DomainError('POS_SCAN_AMBIGUOUS', 'شناسه اسکن‌شده به‌صورت یکتا قابل تشخیص نیست.');
    const row = rows[0];
    if (!row) throw new DomainError('POS_SCAN_NOT_FOUND', 'کالای متناظر با شناسه اسکن‌شده پیدا نشد.');
    if (row.status !== 'active' || !row.sales_enabled) throw new DomainError('POS_VARIANT_NOT_SELLABLE', 'واریانت اسکن‌شده برای فروش فعال نیست.');
    return { variantId: row.id, productId: row.product_id, sku: row.sku, barcode: row.barcode ?? null };
  }

  private normalize(kind: PosVariantLookupKind, raw: unknown): string {
    const value = String(raw ?? '').normalize('NFKC').trim();
    if (!value || value.length > 120 || /[\u0000-\u001F\u007F]/u.test(value)) {
      throw new DomainError('POS_SCAN_INVALID', 'شناسه اسکن‌شده معتبر نیست.');
    }
    if (kind === 'sku') {
      const normalized = value.toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9._\/-]{1,119}$/.test(normalized)) throw new DomainError('POS_SKU_INVALID', 'SKU معتبر نیست.');
      return normalized;
    }
    if (kind !== 'barcode') throw new DomainError('POS_SCAN_KIND_INVALID', 'نوع شناسه اسکن‌شده معتبر نیست.');
    if (!/^[0-9A-Za-z][0-9A-Za-z._\/-]{3,119}$/.test(value)) throw new DomainError('POS_BARCODE_INVALID', 'بارکد معتبر نیست.');
    return value;
  }
}
