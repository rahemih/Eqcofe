export type CatalogDryRunSheet = 'products' | 'variants';

export interface CatalogDryRunRowError {
  sheet: CatalogDryRunSheet;
  row: number;
  code: string;
  field: string | null;
  message: string;
}

export interface CatalogDryRunRowResult {
  sheet: CatalogDryRunSheet;
  row: number;
  valid: boolean;
  errors: CatalogDryRunRowError[];
}

export interface CatalogDryRunResult {
  valid: boolean;
  checkedRows: number;
  validRows: number;
  invalidRows: number;
  rows: CatalogDryRunRowResult[];
}

export class CatalogDryRunError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CatalogDryRunError';
  }
}
