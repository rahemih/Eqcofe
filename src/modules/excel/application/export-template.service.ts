import { Injectable } from '@nestjs/common';
import {
  EXCEL_MIME_XLSX,
  EXCEL_WORKBOOK_CONTRACT_VERSION,
  WorkbookTemplate,
} from '../domain/workbook-contract';

@Injectable()
export class ExportTemplateService {
  build(): WorkbookTemplate {
    return {
      contractVersion: EXCEL_WORKBOOK_CONTRACT_VERSION,
      mimeType: EXCEL_MIME_XLSX,
      fileName: 'eqcofe-product-pricing-template.xlsx',
      sheets: [
        {
          name: 'products',
          columns: [
            { key: 'product_slug', required: true, description: 'شناسه پایدار محصول موجود در Catalog' },
            { key: 'name_fa', required: false, description: 'نام فارسی محصول برای اعتبارسنجی/ویرایش مرحله Catalog' },
            { key: 'status', required: false, description: 'وضعیت محصول؛ اعمال آن فقط از boundary معتبر Catalog انجام می‌شود' },
          ],
        },
        {
          name: 'variants',
          columns: [
            { key: 'sku', required: true, description: 'SKU معتبر Variant در Catalog' },
            { key: 'product_slug', required: true, description: 'محصول مالک Variant' },
            { key: 'barcode', required: false, description: 'بارکد Variant؛ uniqueness در Catalog بررسی می‌شود' },
          ],
        },
        {
          name: 'prices',
          columns: [
            { key: 'sku', required: true, description: 'SKU معتبر Variant' },
            { key: 'price_toman', required: true, description: 'قیمت integer Toman؛ فقط Pricing می‌تواند آن را اعمال کند' },
          ],
        },
      ],
    };
  }
}
