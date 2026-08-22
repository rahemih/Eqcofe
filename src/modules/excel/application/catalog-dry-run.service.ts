import { Injectable } from '@nestjs/common';
import { CatalogQueryService } from '../../catalog/application/catalog-query.service';
import { PosVariantLookupService } from '../../catalog/application/pos-variant-lookup.service';
import { DomainError } from '../../../shared/errors/domain-error';
import { CatalogDryRunError, CatalogDryRunResult, CatalogDryRunRowError, CatalogDryRunRowResult } from '../domain/catalog-dry-run';
import { ParsedWorkbook, WorkbookCellScalar } from '../domain/workbook-contract';

@Injectable()
export class CatalogDryRunService {
  constructor(
    private readonly catalog: CatalogQueryService,
    private readonly variants: PosVariantLookupService,
  ) {}

  async validate(workbook: ParsedWorkbook): Promise<CatalogDryRunResult> {
    const rows: CatalogDryRunRowResult[] = [];
    const products = workbook.sheets.find((x) => x.name === 'products');
    const variants = workbook.sheets.find((x) => x.name === 'variants');
    if (!products || !variants) throw new CatalogDryRunError('EXCEL_DRY_RUN_SHEET_MISSING', 'شیت‌های products و variants برای dry-run الزامی هستند.');

    const productHeader = this.header(products.rows[0], 'products');
    const variantHeader = this.header(variants.rows[0], 'variants');
    this.requireColumns(productHeader, ['product_slug'], 'products');
    this.requireColumns(variantHeader, ['sku', 'product_slug'], 'variants');

    for (let index = 1; index < products.rows.length; index += 1) {
      rows.push(await this.validateProductRow(index + 1, productHeader, products.rows[index] ?? []));
    }
    for (let index = 1; index < variants.rows.length; index += 1) {
      rows.push(await this.validateVariantRow(index + 1, variantHeader, variants.rows[index] ?? []));
    }

    const invalidRows = rows.filter((row) => !row.valid).length;
    return { valid: invalidRows === 0, checkedRows: rows.length, validRows: rows.length - invalidRows, invalidRows, rows };
  }

  private async validateProductRow(row: number, header: string[], cells: WorkbookCellScalar[]): Promise<CatalogDryRunRowResult> {
    const errors: CatalogDryRunRowError[] = [];
    const slug = this.text(this.value(header, cells, 'product_slug'));
    if (!slug) errors.push(this.error('products', row, 'EXCEL_PRODUCT_SLUG_REQUIRED', 'product_slug', 'شناسه محصول الزامی است.'));
    if (slug) {
      try {
        await this.catalog.product(slug);
      } catch (error) {
        errors.push(this.catalogError('products', row, 'product_slug', error, 'EXCEL_PRODUCT_NOT_FOUND', 'محصول در Catalog پیدا نشد.'));
      }
    }
    return { sheet: 'products', row, valid: errors.length === 0, errors };
  }

  private async validateVariantRow(row: number, header: string[], cells: WorkbookCellScalar[]): Promise<CatalogDryRunRowResult> {
    const errors: CatalogDryRunRowError[] = [];
    const sku = this.text(this.value(header, cells, 'sku'));
    const productSlug = this.text(this.value(header, cells, 'product_slug'));
    if (!sku) errors.push(this.error('variants', row, 'EXCEL_VARIANT_SKU_REQUIRED', 'sku', 'SKU الزامی است.'));
    if (!productSlug) errors.push(this.error('variants', row, 'EXCEL_PRODUCT_SLUG_REQUIRED', 'product_slug', 'شناسه محصول الزامی است.'));

    let expectedProductId: string | null = null;
    if (productSlug) {
      try {
        const product = await this.catalog.product(productSlug);
        expectedProductId = product.id;
      } catch (error) {
        errors.push(this.catalogError('variants', row, 'product_slug', error, 'EXCEL_PRODUCT_NOT_FOUND', 'محصول در Catalog پیدا نشد.'));
      }
    }
    if (sku) {
      try {
        const variant = await this.variants.resolve({ kind: 'sku', value: sku });
        if (expectedProductId && variant.productId !== expectedProductId) {
          errors.push(this.error('variants', row, 'EXCEL_VARIANT_PRODUCT_MISMATCH', 'product_slug', 'SKU متعلق به محصول اعلام‌شده نیست.'));
        }
      } catch (error) {
        errors.push(this.catalogError('variants', row, 'sku', error, 'EXCEL_VARIANT_NOT_FOUND', 'SKU در Catalog پیدا نشد یا قابل استفاده نیست.'));
      }
    }
    return { sheet: 'variants', row, valid: errors.length === 0, errors };
  }

  private header(row: WorkbookCellScalar[] | undefined, sheet: 'products' | 'variants'): string[] {
    if (!row) throw new CatalogDryRunError('EXCEL_DRY_RUN_HEADER_MISSING', `هدر شیت ${sheet} وجود ندارد.`);
    const header = row.map((cell) => this.text(cell).toLowerCase());
    if (header.some((key) => !key) || new Set(header).size !== header.length) {
      throw new CatalogDryRunError('EXCEL_DRY_RUN_HEADER_INVALID', `هدر شیت ${sheet} معتبر نیست.`);
    }
    return header;
  }

  private requireColumns(header: string[], required: string[], sheet: string): void {
    for (const column of required) if (!header.includes(column)) throw new CatalogDryRunError('EXCEL_DRY_RUN_COLUMN_MISSING', `ستون ${column} در شیت ${sheet} وجود ندارد.`);
  }

  private value(header: string[], cells: WorkbookCellScalar[], key: string): WorkbookCellScalar {
    const index = header.indexOf(key);
    return index < 0 ? null : (cells[index] ?? null);
  }

  private text(value: WorkbookCellScalar): string {
    return typeof value === 'string' ? value.normalize('NFKC').trim() : value == null ? '' : String(value).normalize('NFKC').trim();
  }

  private error(sheet: 'products' | 'variants', row: number, code: string, field: string | null, message: string): CatalogDryRunRowError {
    return { sheet, row, code, field, message };
  }

  private catalogError(sheet: 'products' | 'variants', row: number, field: string, error: unknown, fallbackCode: string, fallbackMessage: string): CatalogDryRunRowError {
    if (error instanceof DomainError) return this.error(sheet, row, error.code, field, error.message);
    return this.error(sheet, row, fallbackCode, field, fallbackMessage);
  }
}
