import { Injectable } from '@nestjs/common';
import { PosVariantLookupService } from '../../catalog/application/pos-variant-lookup.service';
import { PricingImportApplyService, PricingImportPreview } from '../../pricing/application/pricing-import-apply.service';
import { DomainError } from '../../../shared/errors/domain-error';
import { createWorkbookFingerprint } from '../domain/workbook-fingerprint';
import { ParsedWorkbook, WorkbookCellScalar } from '../domain/workbook-contract';

@Injectable()
export class PricingApplyService {
  constructor(
    private readonly variants: PosVariantLookupService,
    private readonly pricing: PricingImportApplyService,
  ) {}

  async preview(workbook: ParsedWorkbook): Promise<PricingImportPreview> {
    const prices = workbook.sheets.find((sheet) => sheet.name === 'prices');
    if (!prices) throw new DomainError('EXCEL_PRICES_SHEET_MISSING', 'شیت prices برای پیش‌نمایش قیمت الزامی است.');
    const header = this.header(prices.rows[0]);
    this.requireColumns(header, ['sku', 'price_toman']);
    const input = [];
    const seenSku = new Set<string>();
    for (let index = 1; index < prices.rows.length; index += 1) {
      const row = prices.rows[index] ?? [];
      const sku = this.text(this.value(header, row, 'sku')).toUpperCase();
      if (!sku) throw new DomainError('EXCEL_PRICE_SKU_REQUIRED', `SKU در ردیف ${index + 1} الزامی است.`);
      if (seenSku.has(sku)) throw new DomainError('EXCEL_PRICE_SKU_DUPLICATE', `SKU در ردیف ${index + 1} تکراری است.`);
      seenSku.add(sku);
      const rawPrice = this.value(header, row, 'price_toman');
      const price = typeof rawPrice === 'number' ? rawPrice : Number(this.text(rawPrice));
      if (!Number.isSafeInteger(price) || price < 0) {
        throw new DomainError('INVALID_MONEY', `price_toman در ردیف ${index + 1} باید عدد صحیح تومان و غیرمنفی باشد.`);
      }
      const variant = await this.variants.resolve({ kind: 'sku', value: sku });
      input.push({ variantId: variant.variantId, sku: variant.sku, proposedPriceToman: price });
    }
    return this.pricing.preview(createWorkbookFingerprint(workbook), input);
  }

  async apply(workbook: ParsedWorkbook, expectedPreviewHash: string): Promise<{ affectedCount: number }> {
    const preview = await this.preview(workbook);
    if (!expectedPreviewHash || preview.previewHash !== expectedPreviewHash) {
      throw new DomainError('EXCEL_PRICING_PREVIEW_STALE', 'پیش‌نمایش قیمت معتبر نیست یا وضعیت قیمت پس از Preview تغییر کرده است.');
    }
    return this.pricing.apply(preview, expectedPreviewHash);
  }

  private header(row: WorkbookCellScalar[] | undefined): string[] {
    if (!row) throw new DomainError('EXCEL_PRICES_HEADER_MISSING', 'هدر شیت prices وجود ندارد.');
    const header = row.map((cell) => this.text(cell).toLowerCase());
    if (header.some((key) => !key) || new Set(header).size !== header.length) throw new DomainError('EXCEL_PRICES_HEADER_INVALID', 'هدر شیت prices معتبر نیست.');
    return header;
  }

  private requireColumns(header: string[], required: string[]): void {
    for (const key of required) if (!header.includes(key)) throw new DomainError('EXCEL_PRICES_COLUMN_MISSING', `ستون ${key} در شیت prices وجود ندارد.`);
  }

  private value(header: string[], row: WorkbookCellScalar[], key: string): WorkbookCellScalar {
    const index = header.indexOf(key);
    return index < 0 ? null : (row[index] ?? null);
  }

  private text(value: WorkbookCellScalar): string {
    return value == null ? '' : String(value).normalize('NFKC').trim();
  }
}
