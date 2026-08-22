import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CatalogQueryService } from '../../catalog/application/catalog-query.service';
import { PosVariantLookupService } from '../../catalog/application/pos-variant-lookup.service';
import { CatalogImportApplyService, CatalogImportProductOperation, CatalogImportVariantOperation } from '../../catalog/application/catalog-import-apply.service';
import { DomainError } from '../../../shared/errors/domain-error';
import { CatalogDryRunService } from './catalog-dry-run.service';
import { createWorkbookFingerprint } from '../domain/workbook-fingerprint';
import { ParsedWorkbook, WorkbookCellScalar } from '../domain/workbook-contract';

export interface CatalogApplyPreview {
  fingerprint: string;
  previewHash: string;
  products: CatalogImportProductOperation[];
  variants: CatalogImportVariantOperation[];
}

@Injectable()
export class CatalogApplyService {
  constructor(
    private readonly dryRun: CatalogDryRunService,
    private readonly catalog: CatalogQueryService,
    private readonly variantLookup: PosVariantLookupService,
    private readonly catalogApply: CatalogImportApplyService,
  ) {}

  async preview(workbook: ParsedWorkbook): Promise<CatalogApplyPreview> {
    const dryRun = await this.dryRun.validate(workbook);
    if (!dryRun.valid) throw new DomainError('EXCEL_DRY_RUN_INVALID', 'فایل Excel دارای خطاهای Catalog است و قابل Apply نیست.');
    const productsSheet = workbook.sheets.find((x) => x.name === 'products')!;
    const variantsSheet = workbook.sheets.find((x) => x.name === 'variants')!;
    const productHeader = this.header(productsSheet.rows[0] ?? []);
    const variantHeader = this.header(variantsSheet.rows[0] ?? []);
    const products: CatalogImportProductOperation[] = [];
    const variants: CatalogImportVariantOperation[] = [];

    for (let index = 1; index < productsSheet.rows.length; index += 1) {
      const row = productsSheet.rows[index] ?? [];
      const slug = this.text(this.value(productHeader, row, 'product_slug'));
      const resolved = await this.catalog.product(slug);
      const current = await this.catalog.adminProduct(resolved.id);
      const nameFa = this.optionalText(this.value(productHeader, row, 'name_fa'));
      const rawStatus = this.optionalText(this.value(productHeader, row, 'status'));
      const status = rawStatus === undefined ? undefined : this.status(rawStatus);
      products.push({
        id: current.id,
        expectedVersion: Number(current.version),
        ...(nameFa === undefined ? {} : { nameFa }),
        ...(status === undefined ? {} : { status }),
      });
    }

    for (let index = 1; index < variantsSheet.rows.length; index += 1) {
      const row = variantsSheet.rows[index] ?? [];
      const sku = this.text(this.value(variantHeader, row, 'sku'));
      const productSlug = this.text(this.value(variantHeader, row, 'product_slug'));
      const product = await this.catalog.product(productSlug);
      const resolved = await this.variantLookup.resolve({ kind: 'sku', value: sku });
      if (resolved.productId !== product.id) throw new DomainError('EXCEL_VARIANT_PRODUCT_MISMATCH', 'SKU متعلق به محصول اعلام‌شده نیست.');
      const current = (await this.catalog.variants(product.id)).find((variant: any) => variant.id === resolved.variantId);
      if (!current) throw new DomainError('VARIANT_NOT_FOUND', 'واریانت پیدا نشد.');
      const barcodeCell = this.value(variantHeader, row, 'barcode');
      const barcode = barcodeCell === null ? undefined : this.optionalText(barcodeCell) ?? null;
      variants.push({ id: current.id, expectedVersion: Number(current.version), ...(barcode === undefined ? {} : { barcode }) });
    }

    const fingerprint = createWorkbookFingerprint(workbook);
    const previewHash = this.hash({ fingerprint, products, variants });
    return { fingerprint, previewHash, products, variants };
  }

  async apply(workbook: ParsedWorkbook, expectedPreviewHash: string): Promise<{ products: number; variants: number }> {
    const preview = await this.preview(workbook);
    if (!expectedPreviewHash || preview.previewHash !== expectedPreviewHash) {
      throw new DomainError('EXCEL_PREVIEW_STALE', 'Preview معتبر نیست یا وضعیت Catalog پس از Preview تغییر کرده است.');
    }
    return this.catalogApply.apply({ products: preview.products, variants: preview.variants, sourceFingerprint: preview.fingerprint });
  }

  private header(row: WorkbookCellScalar[]): string[] { return row.map((value) => this.text(value).toLowerCase()); }
  private value(header: string[], row: WorkbookCellScalar[], key: string): WorkbookCellScalar { const index = header.indexOf(key); return index < 0 ? null : (row[index] ?? null); }
  private text(value: WorkbookCellScalar): string { return value == null ? '' : String(value).normalize('NFKC').trim(); }
  private optionalText(value: WorkbookCellScalar): string | undefined { const text = this.text(value); return text ? text : undefined; }
  private status(value: string): 'draft' | 'published' | 'archived' {
    if (value === 'draft' || value === 'published' || value === 'archived') return value;
    throw new DomainError('EXCEL_PRODUCT_STATUS_INVALID', 'وضعیت محصول در Excel معتبر نیست.');
  }
  private hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex'); }
}
