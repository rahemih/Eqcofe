import { Injectable } from '@nestjs/common';
import {
  EXCEL_MAX_COLUMNS_PER_SHEET,
  EXCEL_MAX_ROWS_PER_SHEET,
  EXCEL_MAX_UPLOAD_BYTES,
  EXCEL_MIME_XLSX,
  EXCEL_WORKBOOK_CONTRACT_VERSION,
  ParsedWorkbook,
  WorkbookCellScalar,
  WorkbookUploadEnvelope,
  WorkbookValidationError,
} from '../domain/workbook-contract';

@Injectable()
export class SafeWorkbookParserService {
  parse(input: WorkbookUploadEnvelope): ParsedWorkbook {
    this.assertEnvelope(input);

    const seen = new Set<string>();
    const sheets = input.sheets.map((sheet) => {
      const name = String(sheet.name ?? '').normalize('NFKC').trim().toLowerCase();
      if (!/^[a-z][a-z0-9_-]{1,31}$/.test(name)) {
        throw new WorkbookValidationError('EXCEL_SHEET_NAME_INVALID', 'نام شیت معتبر نیست.');
      }
      if (seen.has(name)) {
        throw new WorkbookValidationError('EXCEL_SHEET_DUPLICATE', 'نام شیت تکراری است.');
      }
      seen.add(name);
      if (!Array.isArray(sheet.rows) || sheet.rows.length > EXCEL_MAX_ROWS_PER_SHEET) {
        throw new WorkbookValidationError('EXCEL_ROW_LIMIT_EXCEEDED', 'تعداد ردیف‌های شیت معتبر نیست.');
      }

      const rows = sheet.rows.map((row) => {
        if (!Array.isArray(row) || row.length > EXCEL_MAX_COLUMNS_PER_SHEET) {
          throw new WorkbookValidationError('EXCEL_COLUMN_LIMIT_EXCEEDED', 'تعداد ستون‌های شیت معتبر نیست.');
        }
        return row.map((cell) => this.parseCell(cell?.value, cell?.formula));
      });

      return { name, rows };
    });

    if (sheets.length < 1 || sheets.length > 8) {
      throw new WorkbookValidationError('EXCEL_SHEET_COUNT_INVALID', 'تعداد شیت‌های فایل معتبر نیست.');
    }

    return {
      contractVersion: EXCEL_WORKBOOK_CONTRACT_VERSION,
      fileName: input.fileName.normalize('NFKC').trim(),
      sheets,
    };
  }

  private assertEnvelope(input: WorkbookUploadEnvelope): void {
    if (!input || typeof input !== 'object') {
      throw new WorkbookValidationError('EXCEL_WORKBOOK_REQUIRED', 'ساختار workbook الزامی است.');
    }
    const fileName = String(input.fileName ?? '').normalize('NFKC').trim();
    if (!/\.xlsx$/i.test(fileName) || fileName.length > 180) {
      throw new WorkbookValidationError('EXCEL_FILE_NAME_INVALID', 'نام یا پسوند فایل معتبر نیست.');
    }
    if (input.mimeType !== EXCEL_MIME_XLSX) {
      throw new WorkbookValidationError('EXCEL_MIME_INVALID', 'نوع فایل اکسل معتبر نیست.');
    }
    if (!Number.isSafeInteger(input.byteLength) || input.byteLength <= 0 || input.byteLength > EXCEL_MAX_UPLOAD_BYTES) {
      throw new WorkbookValidationError('EXCEL_FILE_SIZE_INVALID', 'اندازه فایل اکسل معتبر نیست.');
    }
    if (input.hasMacros) {
      throw new WorkbookValidationError('EXCEL_MACRO_FORBIDDEN', 'فایل دارای ماکرو قابل پذیرش نیست.');
    }
    if ((input.externalLinks?.length ?? 0) > 0) {
      throw new WorkbookValidationError('EXCEL_EXTERNAL_LINK_FORBIDDEN', 'لینک خارجی در فایل اکسل مجاز نیست.');
    }
    if (!Array.isArray(input.sheets)) {
      throw new WorkbookValidationError('EXCEL_SHEETS_INVALID', 'ساختار شیت‌ها معتبر نیست.');
    }
  }

  private parseCell(value: unknown, formula?: string | null): WorkbookCellScalar {
    if (formula != null && String(formula).trim() !== '') {
      throw new WorkbookValidationError('EXCEL_FORMULA_FORBIDDEN', 'فرمول اکسل در ورودی مجاز نیست.');
    }
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || !Number.isSafeInteger(value) && Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        throw new WorkbookValidationError('EXCEL_NUMBER_INVALID', 'مقدار عددی سلول معتبر نیست.');
      }
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.normalize('NFKC').trim();
      if (normalized.length > 20_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(normalized)) {
        throw new WorkbookValidationError('EXCEL_CELL_TEXT_INVALID', 'مقدار متنی سلول معتبر نیست.');
      }
      return normalized;
    }
    throw new WorkbookValidationError('EXCEL_CELL_TYPE_INVALID', 'نوع مقدار سلول معتبر نیست.');
  }
}
