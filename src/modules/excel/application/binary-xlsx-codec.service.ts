import { Injectable } from '@nestjs/common';
import { inflateRawSync } from 'node:zlib';
import {
  BinaryWorkbookUpload,
  EXCEL_MAX_COLUMNS_PER_SHEET,
  EXCEL_MAX_ROWS_PER_SHEET,
  EXCEL_MAX_UNCOMPRESSED_BYTES,
  EXCEL_MAX_UPLOAD_BYTES,
  EXCEL_MAX_ZIP_ENTRIES,
  EXCEL_MIME_XLSX,
  WorkbookCellInput,
  WorkbookSheetInput,
  WorkbookUploadEnvelope,
  WorkbookValidationError,
} from '../domain/workbook-contract';

interface ZipEntry {
  name: string;
  data: Buffer;
}

@Injectable()
export class BinaryXlsxCodecService {
  decode(input: BinaryWorkbookUpload): WorkbookUploadEnvelope {
    const fileName = String(input?.fileName ?? '').normalize('NFKC').trim();
    if (!/\.xlsx$/i.test(fileName) || fileName.length > 180) {
      throw new WorkbookValidationError('EXCEL_FILE_NAME_INVALID', 'نام یا پسوند فایل معتبر نیست.');
    }
    if (input?.mimeType !== EXCEL_MIME_XLSX) {
      throw new WorkbookValidationError('EXCEL_MIME_INVALID', 'نوع فایل اکسل معتبر نیست.');
    }

    const bytes = this.decodeBase64(input?.contentBase64);
    if (bytes.length < 1 || bytes.length > EXCEL_MAX_UPLOAD_BYTES) {
      throw new WorkbookValidationError('EXCEL_FILE_SIZE_INVALID', 'اندازه فایل اکسل معتبر نیست.');
    }

    const entries = this.readZip(bytes);
    this.assertSafePackage(entries);
    const sheets = this.readSheets(entries);

    return {
      fileName,
      mimeType: EXCEL_MIME_XLSX,
      byteLength: bytes.length,
      hasMacros: false,
      externalLinks: [],
      sheets,
    };
  }

  private decodeBase64(value: unknown): Buffer {
    const text = String(value ?? '').trim();
    const maxEncoded = Math.ceil(EXCEL_MAX_UPLOAD_BYTES / 3) * 4 + 4;
    if (!text || text.length > maxEncoded || text.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) {
      throw new WorkbookValidationError('EXCEL_BINARY_INVALID', 'محتوای باینری XLSX معتبر نیست.');
    }
    const bytes = Buffer.from(text, 'base64');
    if (bytes.toString('base64') !== text) {
      throw new WorkbookValidationError('EXCEL_BINARY_INVALID', 'محتوای باینری XLSX معتبر نیست.');
    }
    return bytes;
  }

  private readZip(file: Buffer): Map<string, ZipEntry> {
    const eocd = this.findEndOfCentralDirectory(file);
    const diskNo = file.readUInt16LE(eocd + 4);
    const centralDisk = file.readUInt16LE(eocd + 6);
    const entriesOnDisk = file.readUInt16LE(eocd + 8);
    const entryCount = file.readUInt16LE(eocd + 10);
    const centralSize = file.readUInt32LE(eocd + 12);
    const centralOffset = file.readUInt32LE(eocd + 16);

    if (diskNo !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount || entryCount < 1 || entryCount > EXCEL_MAX_ZIP_ENTRIES) {
      throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'ساختار بسته XLSX معتبر نیست.');
    }
    if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff || centralOffset + centralSize > eocd) {
      throw new WorkbookValidationError('EXCEL_ZIP64_UNSUPPORTED', 'ساختار ZIP64 برای XLSX پشتیبانی نمی‌شود.');
    }

    const result = new Map<string, ZipEntry>();
    let offset = centralOffset;
    let totalUncompressed = 0;

    for (let index = 0; index < entryCount; index += 1) {
      if (offset + 46 > file.length || file.readUInt32LE(offset) !== 0x02014b50) {
        throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'دایرکتوری XLSX معتبر نیست.');
      }
      const flags = file.readUInt16LE(offset + 8);
      const method = file.readUInt16LE(offset + 10);
      const expectedCrc = file.readUInt32LE(offset + 16);
      const compressedSize = file.readUInt32LE(offset + 20);
      const uncompressedSize = file.readUInt32LE(offset + 24);
      const nameLength = file.readUInt16LE(offset + 28);
      const extraLength = file.readUInt16LE(offset + 30);
      const commentLength = file.readUInt16LE(offset + 32);
      const localOffset = file.readUInt32LE(offset + 42);
      const next = offset + 46 + nameLength + extraLength + commentLength;
      if (next > file.length || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
        throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'ورودی ZIP معتبر نیست.');
      }
      if ((flags & 0x0001) !== 0 || (method !== 0 && method !== 8)) {
        throw new WorkbookValidationError('EXCEL_ZIP_FEATURE_FORBIDDEN', 'رمزگذاری یا روش فشرده‌سازی XLSX مجاز نیست.');
      }

      const rawName = file.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
      const name = this.safeEntryName(rawName);
      if (result.has(name)) {
        throw new WorkbookValidationError('EXCEL_ZIP_DUPLICATE_ENTRY', 'ورودی تکراری در بسته XLSX وجود دارد.');
      }
      totalUncompressed += uncompressedSize;
      if (totalUncompressed > EXCEL_MAX_UNCOMPRESSED_BYTES) {
        throw new WorkbookValidationError('EXCEL_ZIP_EXPANSION_LIMIT', 'حجم بازشده XLSX بیش از حد مجاز است.');
      }

      if (localOffset + 30 > file.length || file.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'ورودی محلی ZIP معتبر نیست.');
      }
      const localNameLength = file.readUInt16LE(localOffset + 26);
      const localExtraLength = file.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      if (dataOffset + compressedSize > file.length) {
        throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'محدوده داده ZIP معتبر نیست.');
      }
      const compressed = file.subarray(dataOffset, dataOffset + compressedSize);
      let data: Buffer;
      try {
        data = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: Math.min(EXCEL_MAX_UNCOMPRESSED_BYTES, uncompressedSize + 1) });
      } catch {
        throw new WorkbookValidationError('EXCEL_ZIP_DECOMPRESSION_FAILED', 'بازکردن داده XLSX ناموفق بود.');
      }
      if (data.length !== uncompressedSize || this.crc32(data) !== expectedCrc) {
        throw new WorkbookValidationError('EXCEL_ZIP_INTEGRITY_INVALID', 'یکپارچگی داده XLSX معتبر نیست.');
      }
      result.set(name, { name, data });
      offset = next;
    }

    if (offset !== centralOffset + centralSize) {
      throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'اندازه دایرکتوری ZIP معتبر نیست.');
    }
    return result;
  }

  private findEndOfCentralDirectory(file: Buffer): number {
    const min = Math.max(0, file.length - 65_557);
    for (let offset = file.length - 22; offset >= min; offset -= 1) {
      if (file.readUInt32LE(offset) === 0x06054b50) {
        const commentLength = file.readUInt16LE(offset + 20);
        if (offset + 22 + commentLength === file.length) return offset;
      }
    }
    throw new WorkbookValidationError('EXCEL_ZIP_STRUCTURE_INVALID', 'بسته XLSX معتبر نیست.');
  }

  private safeEntryName(value: string): string {
    const name = value.normalize('NFKC').replaceAll('\\', '/');
    if (!name || name.startsWith('/') || name.includes('\u0000') || name.split('/').some((part) => part === '..' || part === '.')) {
      throw new WorkbookValidationError('EXCEL_ZIP_PATH_INVALID', 'مسیر داخلی XLSX معتبر نیست.');
    }
    return name;
  }

  private assertSafePackage(entries: Map<string, ZipEntry>): void {
    if (!entries.has('[Content_Types].xml') || !entries.has('xl/workbook.xml') || !entries.has('xl/_rels/workbook.xml.rels')) {
      throw new WorkbookValidationError('EXCEL_OOXML_REQUIRED_PART_MISSING', 'ساختار OOXML فایل کامل نیست.');
    }
    for (const entry of entries.values()) {
      const lower = entry.name.toLowerCase();
      if (lower.includes('vbaproject.bin') || lower.includes('/activex/') || lower.includes('/embeddings/') || lower.startsWith('xl/macrosheets/')) {
        throw new WorkbookValidationError('EXCEL_MACRO_FORBIDDEN', 'محتوای اجرایی یا ماکرو در XLSX مجاز نیست.');
      }
      if (lower.startsWith('xl/externallinks/')) {
        throw new WorkbookValidationError('EXCEL_EXTERNAL_LINK_FORBIDDEN', 'لینک خارجی در XLSX مجاز نیست.');
      }
      if (lower.endsWith('.xml') || lower.endsWith('.rels')) {
        const xml = this.xml(entry.data);
        if (/TargetMode\s*=\s*["']External["']/i.test(xml)) {
          throw new WorkbookValidationError('EXCEL_EXTERNAL_LINK_FORBIDDEN', 'رابطه خارجی در XLSX مجاز نیست.');
        }
      }
    }
    const contentTypes = this.xml(this.required(entries, '[Content_Types].xml').data);
    if (/macroEnabled|application\/vnd\.ms-office\.vbaProject/i.test(contentTypes)) {
      throw new WorkbookValidationError('EXCEL_MACRO_FORBIDDEN', 'نوع محتوای ماکرو در XLSX مجاز نیست.');
    }
  }

  private readSheets(entries: Map<string, ZipEntry>): WorkbookSheetInput[] {
    const workbookXml = this.xml(this.required(entries, 'xl/workbook.xml').data);
    const relsXml = this.xml(this.required(entries, 'xl/_rels/workbook.xml.rels').data);
    const relationships = new Map<string, string>();

    for (const match of relsXml.matchAll(/<(?:\w+:)?Relationship\b[^>]*\/?\s*>/gi)) {
      const tag = match[0];
      const id = this.attribute(tag, 'Id');
      const type = this.attribute(tag, 'Type');
      const target = this.attribute(tag, 'Target');
      if (id && target && /\/worksheet$/i.test(type ?? '')) {
        relationships.set(id, this.resolveTarget('xl/workbook.xml', target));
      }
    }

    const sharedStrings = entries.has('xl/sharedStrings.xml')
      ? this.readSharedStrings(this.xml(this.required(entries, 'xl/sharedStrings.xml').data))
      : [];
    const sheets: WorkbookSheetInput[] = [];

    for (const match of workbookXml.matchAll(/<(?:\w+:)?sheet\b[^>]*\/?\s*>/gi)) {
      const tag = match[0];
      const name = this.attribute(tag, 'name');
      const relationshipId = this.attribute(tag, 'r:id');
      if (!name || !relationshipId) {
        throw new WorkbookValidationError('EXCEL_OOXML_SHEET_INVALID', 'تعریف شیت XLSX معتبر نیست.');
      }
      const target = relationships.get(relationshipId);
      if (!target || !entries.has(target)) {
        throw new WorkbookValidationError('EXCEL_OOXML_SHEET_INVALID', 'فایل شیت XLSX یافت نشد.');
      }
      sheets.push({ name: this.decodeXml(name), rows: this.readWorksheet(this.xml(this.required(entries, target).data), sharedStrings) });
      if (sheets.length > 8) {
        throw new WorkbookValidationError('EXCEL_SHEET_COUNT_INVALID', 'تعداد شیت‌های فایل معتبر نیست.');
      }
    }
    if (sheets.length < 1) {
      throw new WorkbookValidationError('EXCEL_SHEET_COUNT_INVALID', 'فایل XLSX هیچ شیت معتبری ندارد.');
    }
    return sheets;
  }

  private readSharedStrings(xml: string): string[] {
    const strings: string[] = [];
    for (const match of xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/gi)) {
      strings.push(this.textNodes(match[1]));
    }
    return strings;
  }

  private readWorksheet(xml: string, sharedStrings: string[]): WorkbookCellInput[][] {
    if (/<(?:\w+:)?f(?:\s|>)/i.test(xml)) {
      throw new WorkbookValidationError('EXCEL_FORMULA_FORBIDDEN', 'فرمول اکسل در ورودی مجاز نیست.');
    }
    const rows: WorkbookCellInput[][] = [];
    let observedRows = 0;
    for (const rowMatch of xml.matchAll(/<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/gi)) {
      observedRows += 1;
      if (observedRows > EXCEL_MAX_ROWS_PER_SHEET) {
        throw new WorkbookValidationError('EXCEL_ROW_LIMIT_EXCEEDED', 'تعداد ردیف‌های شیت معتبر نیست.');
      }
      const rowTag = rowMatch[1];
      const rowNumber = Number(this.attribute(rowTag, 'r') ?? observedRows);
      if (!Number.isSafeInteger(rowNumber) || rowNumber < 1 || rowNumber > EXCEL_MAX_ROWS_PER_SHEET) {
        throw new WorkbookValidationError('EXCEL_ROW_LIMIT_EXCEEDED', 'شماره ردیف XLSX معتبر نیست.');
      }
      const row: WorkbookCellInput[] = [];
      for (const cellMatch of rowMatch[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:>([\s\S]*?)<\/(?:\w+:)?c>|\/\s*>)/gi)) {
        const attrs = cellMatch[1];
        const body = cellMatch[2] ?? '';
        const coordinate = this.attribute(attrs, 'r');
        if (!coordinate) throw new WorkbookValidationError('EXCEL_CELL_REFERENCE_INVALID', 'مرجع سلول XLSX معتبر نیست.');
        const column = this.columnIndex(coordinate);
        if (column >= EXCEL_MAX_COLUMNS_PER_SHEET) {
          throw new WorkbookValidationError('EXCEL_COLUMN_LIMIT_EXCEEDED', 'تعداد ستون‌های شیت معتبر نیست.');
        }
        while (row.length <= column) row.push({ value: null });
        row[column] = { value: this.cellValue(attrs, body, sharedStrings) };
      }
      while (rows.length < rowNumber - 1) rows.push([]);
      rows[rowNumber - 1] = row;
    }
    return rows;
  }

  private cellValue(attrs: string, body: string, sharedStrings: string[]): string | number | boolean | null {
    const type = (this.attribute(attrs, 't') ?? 'n').toLowerCase();
    if (type === 'inlinestr') return this.textNodes(body);
    const valueMatch = body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/i);
    if (!valueMatch) return null;
    const raw = this.decodeXml(valueMatch[1]).trim();
    if (type === 's') {
      const index = Number(raw);
      if (!Number.isSafeInteger(index) || index < 0 || index >= sharedStrings.length) {
        throw new WorkbookValidationError('EXCEL_SHARED_STRING_INVALID', 'مرجع متن اشتراکی XLSX معتبر نیست.');
      }
      return sharedStrings[index];
    }
    if (type === 'b') {
      if (raw === '1') return true;
      if (raw === '0') return false;
      throw new WorkbookValidationError('EXCEL_BOOLEAN_INVALID', 'مقدار بولی XLSX معتبر نیست.');
    }
    if (type === 'str') return raw;
    if (type !== 'n') {
      throw new WorkbookValidationError('EXCEL_CELL_TYPE_INVALID', 'نوع سلول XLSX پشتیبانی نمی‌شود.');
    }
    if (raw === '') return null;
    const number = Number(raw);
    if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
      throw new WorkbookValidationError('EXCEL_NUMBER_INVALID', 'مقدار عددی XLSX معتبر نیست.');
    }
    return number;
  }

  private columnIndex(reference: string): number {
    const match = /^([A-Z]+)[1-9][0-9]*$/i.exec(reference.trim());
    if (!match) throw new WorkbookValidationError('EXCEL_CELL_REFERENCE_INVALID', 'مرجع سلول XLSX معتبر نیست.');
    let value = 0;
    for (const char of match[1].toUpperCase()) value = value * 26 + char.charCodeAt(0) - 64;
    return value - 1;
  }

  private textNodes(xml: string): string {
    let value = '';
    for (const match of xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi)) value += this.decodeXml(match[1]);
    return value.normalize('NFKC').trim();
  }

  private attribute(tag: string, name: string): string | undefined {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(tag);
    return match ? this.decodeXml(match[2]) : undefined;
  }

  private resolveTarget(base: string, target: string): string {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      throw new WorkbookValidationError('EXCEL_EXTERNAL_LINK_FORBIDDEN', 'Target خارجی در XLSX مجاز نیست.');
    }
    const parts = (target.startsWith('/') ? target.slice(1) : `${base.slice(0, base.lastIndexOf('/') + 1)}${target}`).replaceAll('\\', '/').split('/');
    const resolved: string[] = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!resolved.length) throw new WorkbookValidationError('EXCEL_ZIP_PATH_INVALID', 'مسیر رابطه XLSX معتبر نیست.');
        resolved.pop();
      } else resolved.push(part);
    }
    return resolved.join('/');
  }

  private xml(data: Buffer): string {
    const text = data.toString('utf8');
    if (/<!DOCTYPE|<!ENTITY/i.test(text) || text.includes('\u0000')) {
      throw new WorkbookValidationError('EXCEL_XML_UNSAFE', 'XML داخلی XLSX ایمن نیست.');
    }
    return text;
  }

  private decodeXml(value: string): string {
    return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, key: string) => {
      const lower = key.toLowerCase();
      if (lower === 'amp') return '&';
      if (lower === 'lt') return '<';
      if (lower === 'gt') return '>';
      if (lower === 'quot') return '"';
      if (lower === 'apos') return "'";
      const code = lower.startsWith('#x') ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        throw new WorkbookValidationError('EXCEL_XML_ENTITY_INVALID', 'Entity داخلی XLSX معتبر نیست.');
      }
      return String.fromCodePoint(code);
    });
  }

  private required(entries: Map<string, ZipEntry>, name: string): ZipEntry {
    const entry = entries.get(name);
    if (!entry) throw new WorkbookValidationError('EXCEL_OOXML_REQUIRED_PART_MISSING', `بخش الزامی XLSX یافت نشد: ${name}`);
    return entry;
  }

  private crc32(data: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
