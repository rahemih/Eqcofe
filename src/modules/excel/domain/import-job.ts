export const IMPORT_JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export interface ImportJobState {
  status: ImportJobStatus;
  completedAt: Date | null;
  failureCode: string | null;
  failureMessage: string | null;
}

export interface ImportJobFailure {
  code: string;
  message: string;
}

export class ImportJobError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ImportJobError';
  }
}

export function transitionImportJob(
  current: ImportJobState,
  target: Exclude<ImportJobStatus, 'pending'>,
  failure?: ImportJobFailure,
  now: Date = new Date(),
): ImportJobState {
  if (current.status === target) {
    if (target === 'failed') {
      const normalized = normalizeFailure(failure);
      if (current.failureCode !== normalized.code || current.failureMessage !== normalized.message) {
        throw new ImportJobError('EXCEL_IMPORT_FAILURE_CONFLICT', 'نتیجه شکست با نتیجه ثبت‌شده سازگار نیست.');
      }
    }
    return current;
  }

  const allowed =
    current.status === 'pending'
      ? target === 'processing' || target === 'failed'
      : current.status === 'processing'
        ? target === 'completed' || target === 'failed'
        : false;
  if (!allowed) {
    throw new ImportJobError('EXCEL_IMPORT_REPLAY_BLOCKED', 'چرخه عمر job اجازه اجرای دوباره این عملیات را نمی‌دهد.');
  }

  if (target === 'failed') {
    const normalized = normalizeFailure(failure);
    return {
      status: 'failed',
      completedAt: now,
      failureCode: normalized.code,
      failureMessage: normalized.message,
    };
  }

  if (failure !== undefined) {
    throw new ImportJobError('EXCEL_IMPORT_FAILURE_UNEXPECTED', 'اطلاعات شکست فقط برای وضعیت failed مجاز است.');
  }
  if (target === 'completed') {
    return { status: 'completed', completedAt: now, failureCode: null, failureMessage: null };
  }
  return { status: 'processing', completedAt: null, failureCode: null, failureMessage: null };
}

function normalizeFailure(failure?: ImportJobFailure): ImportJobFailure {
  const code = String(failure?.code ?? '').normalize('NFKC').trim().toUpperCase();
  const message = String(failure?.message ?? '').normalize('NFKC').trim();
  if (!/^[A-Z][A-Z0-9_]{2,119}$/.test(code)) {
    throw new ImportJobError('EXCEL_IMPORT_FAILURE_CODE_INVALID', 'کد شکست import job معتبر نیست.');
  }
  if (message.length < 1 || message.length > 1_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(message)) {
    throw new ImportJobError('EXCEL_IMPORT_FAILURE_MESSAGE_INVALID', 'پیام شکست import job معتبر نیست.');
  }
  return { code, message };
}
