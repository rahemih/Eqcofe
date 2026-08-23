export const EXCEL_WORKBOOK_CONTRACT_VERSION = 'eqcofe-step50-v1';
export const EXCEL_MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const EXCEL_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const EXCEL_MAX_ROWS_PER_SHEET = 5_000;
export const EXCEL_MAX_COLUMNS_PER_SHEET = 64;
export const EXCEL_MAX_ZIP_ENTRIES = 256;
export const EXCEL_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

export type WorkbookCellScalar = string | number | boolean | null;

export interface WorkbookCellInput {
  value: WorkbookCellScalar;
  formula?: string | null;
}

export interface WorkbookSheetInput {
  name: string;
  rows: WorkbookCellInput[][];
}

export interface WorkbookUploadEnvelope {
  fileName: string;
  mimeType: string;
  byteLength: number;
  hasMacros?: boolean;
  externalLinks?: string[];
  sheets: WorkbookSheetInput[];
}

/**
 * HTTP-safe transport for a real XLSX file. The client supplies only the file
 * identity and opaque bytes; workbook structure/security facts are derived on
 * the server by BinaryXlsxCodecService and are never trusted from the client.
 */
export interface BinaryWorkbookUpload {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export interface ParsedWorkbookSheet {
  name: string;
  rows: WorkbookCellScalar[][];
}

export interface ParsedWorkbook {
  contractVersion: typeof EXCEL_WORKBOOK_CONTRACT_VERSION;
  fileName: string;
  sheets: ParsedWorkbookSheet[];
}

export interface WorkbookTemplateColumn {
  key: string;
  required: boolean;
  description: string;
}

export interface WorkbookTemplateSheet {
  name: 'products' | 'variants' | 'prices';
  columns: WorkbookTemplateColumn[];
}

export interface WorkbookTemplate {
  contractVersion: typeof EXCEL_WORKBOOK_CONTRACT_VERSION;
  mimeType: typeof EXCEL_MIME_XLSX;
  fileName: 'eqcofe-product-pricing-template.xlsx';
  sheets: WorkbookTemplateSheet[];
}

export class WorkbookValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkbookValidationError';
  }
}
