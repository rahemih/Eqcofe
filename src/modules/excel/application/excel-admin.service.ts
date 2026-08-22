import { Injectable } from '@nestjs/common';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { WorkbookUploadEnvelope } from '../domain/workbook-contract';
import { createWorkbookFingerprint } from '../domain/workbook-fingerprint';
import { SafeWorkbookParserService } from './safe-workbook-parser.service';
import { ExportTemplateService } from './export-template.service';
import { ImportJobService } from './import-job.service';
import { ImportRecoveryService } from './import-recovery.service';
import { CatalogDryRunService } from './catalog-dry-run.service';
import { CatalogApplyService } from './catalog-apply.service';
import { PricingApplyService } from './pricing-apply.service';

@Injectable()
export class ExcelAdminService {
  constructor(
    private readonly parser: SafeWorkbookParserService,
    private readonly templates: ExportTemplateService,
    private readonly jobs: ImportJobService,
    private readonly recovery: ImportRecoveryService,
    private readonly dryRunService: CatalogDryRunService,
    private readonly catalog: CatalogApplyService,
    private readonly pricing: PricingApplyService,
    private readonly audit: AuditWriter,
    private readonly ctx: RequestContextStore,
  ) {}

  exportTemplate() {
    this.staff();
    return this.templates.build();
  }

  async createImport(envelope: WorkbookUploadEnvelope) {
    const actor = this.staff();
    const workbook = this.parser.parse(envelope);
    const result = await this.jobs.create({ workbook, requestedBy: actor.id });
    await this.writeAudit('excel.import.create', 'excel.import_job', result.job.id, {
      contract_version: result.job.contract_version,
      fingerprint: result.job.fingerprint,
      status: result.job.status,
      replay: result.replay,
    });
    return result;
  }

  async dryRun(envelope: WorkbookUploadEnvelope) {
    this.staff();
    return this.dryRunService.validate(this.parser.parse(envelope));
  }

  async catalogPreview(envelope: WorkbookUploadEnvelope) {
    this.staff();
    return this.catalog.preview(this.parser.parse(envelope));
  }

  async pricingPreview(envelope: WorkbookUploadEnvelope) {
    this.staff();
    return this.pricing.preview(this.parser.parse(envelope));
  }

  async catalogApply(envelope: WorkbookUploadEnvelope, expectedPreviewHash: unknown) {
    this.staff();
    const workbook = this.parser.parse(envelope);
    const fingerprint = createWorkbookFingerprint(workbook);
    const previewHash = this.previewHash(expectedPreviewHash);
    const result = await this.catalog.apply(workbook, previewHash);
    await this.writeAudit('excel.catalog.apply', 'excel.workbook', undefined, {
      fingerprint,
      products: result.products,
      variants: result.variants,
    });
    return result;
  }

  async pricingApply(envelope: WorkbookUploadEnvelope, expectedPreviewHash: unknown) {
    this.staff();
    const workbook = this.parser.parse(envelope);
    const fingerprint = createWorkbookFingerprint(workbook);
    const previewHash = this.previewHash(expectedPreviewHash);
    const result = await this.pricing.apply(workbook, previewHash);
    await this.writeAudit('excel.pricing.apply', 'excel.workbook', undefined, {
      fingerprint,
      affected_count: result.affectedCount,
    });
    return result;
  }

  async recover(jobId: unknown, note: unknown) {
    this.staff();
    const result = await this.recovery.recover(jobId, note);
    await this.writeAudit('excel.import.recover', 'excel.import_job', result.jobId, {
      next_attempt_no: result.nextAttemptNo,
    }, String(note ?? '').normalize('NFKC').trim());
    return result;
  }

  private staff() {
    const actor = this.ctx.get()?.actor;
    if (actor?.type !== 'staff' || !actor.id) {
      throw new DomainError('EXCEL_STAFF_REQUIRED', 'عملیات مدیریتی Excel فقط برای کاربر سازمانی مجاز است.');
    }
    return actor;
  }

  private previewHash(value: unknown): string {
    const hash = String(value ?? '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) throw new DomainError('EXCEL_PREVIEW_HASH_INVALID', 'شناسه Preview معتبر نیست.');
    return hash;
  }

  private async writeAudit(action: string, resourceType: string, resourceId: string | undefined, afterData: unknown, reason?: string) {
    const context = this.ctx.require();
    await this.audit.write({
      actorType: 'staff',
      actorId: context.actor.id,
      action,
      resourceType,
      resourceId,
      afterData,
      reason: reason || undefined,
      requestId: context.requestId,
      traceId: context.correlationId,
    });
  }
}
