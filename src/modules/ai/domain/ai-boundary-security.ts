import { DomainError } from '../../../shared/errors/domain-error';

const UNSAFE_OUTPUT = /<\s*script\b|javascript\s*:|\b(?:authorization\s*:\s*bearer|bearer\s+[A-Za-z0-9._~+\/-]{8,}|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|secret[_-]?key\s*[:=])\b/i;
const CONTROL_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export function normalizeUntrustedText(value: unknown, bounds: { min: number; max: number; code: string; message: string }): string {
  const normalized = String(value ?? '').normalize('NFKC').trim();
  if (normalized.length < bounds.min || normalized.length > bounds.max || CONTROL_CHAR.test(normalized)) {
    throw new DomainError(bounds.code, bounds.message);
  }
  return normalized;
}

export function frameUntrustedJson(label: string, value: unknown): string {
  if (!/^[A-Z0-9_]{2,80}$/.test(label)) throw new DomainError('AI_SECURITY_FRAME_INVALID', 'مرز امنیتی ورودی هوشمند معتبر نیست.');
  return `<${label}_JSON>\n${JSON.stringify(value)}\n</${label}_JSON>`;
}

export function assertSafeModelText(value: unknown, code: string, message: string, max: number): string {
  const text = String(value ?? '').trim();
  if (!text || text.length > max || CONTROL_CHAR.test(text) || UNSAFE_OUTPUT.test(text)) {
    throw new DomainError(code, message);
  }
  return text;
}
