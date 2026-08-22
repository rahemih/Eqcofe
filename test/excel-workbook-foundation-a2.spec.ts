import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SafeWorkbookParserService } from '../src/modules/excel/application/safe-workbook-parser.service';
import { ExportTemplateService } from '../src/modules/excel/application/export-template.service';
import {
  EXCEL_MIME_XLSX,
  WorkbookUploadEnvelope,
  WorkbookValidationError,
} from '../src/modules/excel/domain/workbook-contract';

function validWorkbook(): WorkbookUploadEnvelope {
  return {
    fileName: 'products.xlsx',
    mimeType: EXCEL_MIME_XLSX,
    byteLength: 1024,
    sheets: [
      {
        name: 'products',
        rows: [
          [{ value: 'product_slug' }, { value: 'name_fa' }],
          [{ value: 'tamper-58' }, { value: 'تمپر ۵۸' }],
        ],
      },
    ],
  };
}

function expectCode(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => error instanceof WorkbookValidationError && error.code === code);
}

test('Step 50 A2 parses bounded xlsx workbook envelope deterministically', () => {
  const result = new SafeWorkbookParserService().parse(validWorkbook());
  assert.equal(result.contractVersion, 'eqcofe-step50-v1');
  assert.equal(result.sheets[0]?.name, 'products');
  assert.equal(result.sheets[0]?.rows[1]?.[1], 'تمپر ۵۸');
});

test('Step 50 A2 rejects macros external links formulas and wrong MIME', () => {
  const parser = new SafeWorkbookParserService();
  expectCode(() => parser.parse({ ...validWorkbook(), hasMacros: true }), 'EXCEL_MACRO_FORBIDDEN');
  expectCode(() => parser.parse({ ...validWorkbook(), externalLinks: ['https://example.com'] }), 'EXCEL_EXTERNAL_LINK_FORBIDDEN');
  const formula = validWorkbook();
  formula.sheets[0]!.rows[1]![1] = { value: 'x', formula: '=WEBSERVICE("https://example.com")' };
  expectCode(() => parser.parse(formula), 'EXCEL_FORMULA_FORBIDDEN');
  expectCode(() => parser.parse({ ...validWorkbook(), mimeType: 'application/octet-stream' }), 'EXCEL_MIME_INVALID');
});

test('Step 50 A2 rejects oversized files malformed cells and duplicate sheets', () => {
  const parser = new SafeWorkbookParserService();
  expectCode(() => parser.parse({ ...validWorkbook(), byteLength: 11 * 1024 * 1024 }), 'EXCEL_FILE_SIZE_INVALID');
  const duplicate = validWorkbook();
  duplicate.sheets.push({ name: 'PRODUCTS', rows: [] });
  expectCode(() => parser.parse(duplicate), 'EXCEL_SHEET_DUPLICATE');
  const badCell = validWorkbook();
  badCell.sheets[0]!.rows[1]![0] = { value: { unsafe: true } as never };
  expectCode(() => parser.parse(badCell), 'EXCEL_CELL_TYPE_INVALID');
});

test('Step 50 A2 export template is versioned and separates Catalog from Pricing columns', () => {
  const template = new ExportTemplateService().build();
  assert.equal(template.fileName, 'eqcofe-product-pricing-template.xlsx');
  assert.deepEqual(template.sheets.map((sheet) => sheet.name), ['products', 'variants', 'prices']);
  assert.ok(template.sheets.find((sheet) => sheet.name === 'prices')?.columns.some((column) => column.key === 'price_toman'));
  assert.ok(template.sheets.find((sheet) => sheet.name === 'variants')?.columns.some((column) => column.key === 'sku'));
});

test('Step 50 A2 parser and template retain no mutation or workbook execution authority', () => {
  const moduleSource = readFileSync('src/modules/excel/excel.module.ts', 'utf8');
  const parserSource = readFileSync('src/modules/excel/application/safe-workbook-parser.service.ts', 'utf8');
  const templateSource = readFileSync('src/modules/excel/application/export-template.service.ts', 'utf8');
  assert.doesNotMatch(moduleSource, /PricingModule|InventoryModule|PaymentsModule|FinanceModule|ProductCommandService|VariantCommandService/);
  assert.doesNotMatch(parserSource + templateSource, /CatalogQueryService|PosVariantLookupService|ProductCommandService|VariantCommandService|eval\(|Function\(|child_process|exec\(|spawn\(/);
  assert.match(parserSource, /EXCEL_FORMULA_FORBIDDEN/);
  assert.match(parserSource, /EXCEL_MACRO_FORBIDDEN/);
  assert.match(parserSource, /EXCEL_EXTERNAL_LINK_FORBIDDEN/);
});
