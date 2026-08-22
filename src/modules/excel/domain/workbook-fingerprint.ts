import { createHash } from 'node:crypto';
import { ParsedWorkbook, WorkbookCellScalar } from './workbook-contract';

export function createWorkbookFingerprint(workbook: ParsedWorkbook): string {
  const canonical = {
    contractVersion: workbook.contractVersion,
    sheets: workbook.sheets
      .map((sheet) => ({
        name: sheet.name,
        rows: sheet.rows.map((row) => row.map(canonicalCell)),
      }))
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  };
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}

function canonicalCell(value: WorkbookCellScalar): WorkbookCellScalar {
  if (typeof value === 'number' && Object.is(value, -0)) return 0;
  return value;
}
