import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import YAML from 'yaml';
import { BinaryXlsxCodecService } from '../src/modules/excel/application/binary-xlsx-codec.service';
import { EXCEL_MIME_XLSX, WorkbookValidationError } from '../src/modules/excel/domain/workbook-contract';

interface EntryInput { name: string; content: string | Buffer; deflate?: boolean }

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: EntryInput[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    const method = entry.deflate ? 8 : 0;
    const compressed = entry.deflate ? deflateRawSync(raw) : raw;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + compressed.length;
  }

  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  return Buffer.concat([localData, centralData, eocd]);
}

function workbook(sheetXml: string, extra: EntryInput[] = [], deflate = true): Buffer {
  return zip([
    { name: '[Content_Types].xml', deflate, content: '<?xml version="1.0"?><Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>' },
    { name: 'xl/workbook.xml', deflate, content: '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="products" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', deflate, content: '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', deflate, content: sheetXml },
    ...extra,
  ]);
}

function upload(bytes: Buffer) {
  return { fileName: 'catalog.xlsx', mimeType: EXCEL_MIME_XLSX, contentBase64: bytes.toString('base64') };
}

const validSheet = '<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>slug</t></is></c><c r="B1" t="inlineStr"><is><t>name_fa</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>v60</t></is></c><c r="B2" t="inlineStr"><is><t>V60</t></is></c></row></sheetData></worksheet>';

test('Step 50 A10 decodes real deflated XLSX bytes and derives workbook facts server-side', () => {
  const decoded = new BinaryXlsxCodecService().decode(upload(workbook(validSheet)));
  assert.equal(decoded.byteLength > 0, true);
  assert.equal(decoded.hasMacros, false);
  assert.deepEqual(decoded.externalLinks, []);
  assert.equal(decoded.sheets.length, 1);
  assert.equal(decoded.sheets[0].name, 'products');
  assert.equal(decoded.sheets[0].rows[1][0].value, 'v60');
});

test('Step 50 A10 rejects formula authority from actual worksheet XML', () => {
  const sheet = '<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>';
  assert.throws(() => new BinaryXlsxCodecService().decode(upload(workbook(sheet))), (error: unknown) => error instanceof WorkbookValidationError && error.code === 'EXCEL_FORMULA_FORBIDDEN');
});

test('Step 50 A10 rejects macro/embedded executable package parts from actual XLSX bytes', () => {
  const bytes = workbook(validSheet, [{ name: 'xl/vbaProject.bin', content: Buffer.from([1,2,3]) }]);
  assert.throws(() => new BinaryXlsxCodecService().decode(upload(bytes)), (error: unknown) => error instanceof WorkbookValidationError && error.code === 'EXCEL_MACRO_FORBIDDEN');
});

test('Step 50 A10 rejects external relationships and ZIP traversal before workbook orchestration', () => {
  const external = workbook(validSheet, [{ name: 'xl/worksheets/_rels/sheet1.xml.rels', content: '<Relationships><Relationship Id="rId2" Target="https://example.com/data" TargetMode="External"/></Relationships>' }]);
  assert.throws(() => new BinaryXlsxCodecService().decode(upload(external)), (error: unknown) => error instanceof WorkbookValidationError && error.code === 'EXCEL_EXTERNAL_LINK_FORBIDDEN');
  const traversal = zip([{ name: '../evil.xml', content: '<x/>' }, { name: '[Content_Types].xml', content: '<Types/>' }]);
  assert.throws(() => new BinaryXlsxCodecService().decode(upload(traversal)), (error: unknown) => error instanceof WorkbookValidationError && error.code === 'EXCEL_ZIP_PATH_INVALID');
});

test('Step 50 A10 rejects malformed base64 and corrupted ZIP integrity fail closed', () => {
  assert.throws(() => new BinaryXlsxCodecService().decode({ fileName: 'x.xlsx', mimeType: EXCEL_MIME_XLSX, contentBase64: 'not-base64===' }), (error: unknown) => error instanceof WorkbookValidationError && error.code === 'EXCEL_BINARY_INVALID');
  const bytes = workbook(validSheet, [], false);
  const marker = Buffer.from('slug');
  const offset = bytes.indexOf(marker);
  assert.notEqual(offset, -1);
  bytes[offset] ^= 0x01;
  assert.throws(() => new BinaryXlsxCodecService().decode(upload(bytes)), (error: unknown) => error instanceof WorkbookValidationError && error.code === 'EXCEL_ZIP_INTEGRITY_INVALID');
});

test('Step 50 A10 removes client authority over decoded sheets macros links and byte length', () => {
  const controller = fs.readFileSync('src/modules/excel/presentation/excel-admin.controller.ts','utf8');
  const admin = fs.readFileSync('src/modules/excel/application/excel-admin.service.ts','utf8');
  const contract:any = YAML.parse(fs.readFileSync('contracts/http/openapi-step50-a8.yaml','utf8'));
  assert.match(controller,/BinaryWorkbookUpload/);
  assert.match(admin,/this\.parser\.parse\(this\.binary\.decode\(upload\)\)/);
  const binary = contract.components.schemas.ExcelBinaryWorkbook;
  assert.equal(binary.additionalProperties,false);
  assert.deepEqual(binary.required,['fileName','mimeType','contentBase64']);
  for (const forbidden of ['sheets','hasMacros','externalLinks','byteLength']) assert.equal(binary.properties[forbidden],undefined,forbidden);
  assert.equal(binary.properties.contentBase64.contentEncoding,'base64');
});

test('Step 50 A10 adds no spreadsheet dependency, persistence authority or migration', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  for (const name of ['xlsx','exceljs','jszip','adm-zip','yauzl']) assert.equal(all[name],undefined,name);
  const codec = fs.readFileSync('src/modules/excel/application/binary-xlsx-codec.service.ts','utf8');
  const moduleSource = fs.readFileSync('src/modules/excel/excel.module.ts','utf8');
  assert.doesNotMatch(codec,/INSERT|UPDATE|DELETE|sql`/i);
  assert.doesNotMatch(moduleSource,/InventoryModule|OrdersModule|PaymentsModule|FinanceModule/);
  assert.deepEqual(fs.readdirSync('database/migrations').filter(x=>/0058_excel|step[-_]?50.*a10/i.test(x)),[]);
});

test('Step 50 A10 retains every focused Step 50 regression suite A2 through A9', () => {
  for (const path of [
    'test/excel-workbook-foundation-a2.spec.ts',
    'test/excel-import-job-a3.spec.ts',
    'test/excel-catalog-dry-run-a4.spec.ts',
    'test/excel-catalog-apply-a5.spec.ts',
    'test/excel-pricing-apply-a6.spec.ts',
    'test/excel-recovery-concurrency-a7.spec.ts',
    'test/excel-admin-api-a8.spec.ts',
    'test/excel-security-e2e-a9.spec.ts',
  ]) assert.equal(fs.existsSync(path), true, path);
});
