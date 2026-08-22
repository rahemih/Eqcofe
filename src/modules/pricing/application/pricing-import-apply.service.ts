import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { PricingRepository } from '../infrastructure/pricing.repository';
import { ProfitGuardService } from './profit-guard.service';

export interface PricingImportPreviewInput {
  variantId: string;
  sku: string;
  proposedPriceToman: number;
}

export interface PricingImportPreviewItem extends PricingImportPreviewInput {
  currentBasePriceId: string | null;
  currentPriceToman: number | null;
  guardStatus: string;
  guardReason: string | null;
}

export interface PricingImportPreview {
  sourceFingerprint: string;
  previewHash: string;
  items: PricingImportPreviewItem[];
}

@Injectable()
export class PricingImportApplyService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repo: PricingRepository,
    private readonly guard: ProfitGuardService,
    private readonly outbox: OutboxWriter,
    private readonly audit: AuditWriter,
    private readonly ctx: RequestContextStore,
  ) {}

  async preview(sourceFingerprint: string, input: PricingImportPreviewInput[]): Promise<PricingImportPreview> {
    if (!/^[a-f0-9]{64}$/u.test(sourceFingerprint)) throw new DomainError('EXCEL_FINGERPRINT_INVALID', 'اثر انگشت workbook معتبر نیست.');
    const seen = new Set<string>();
    const items: PricingImportPreviewItem[] = [];
    for (const row of input) {
      this.validateMoney(row.proposedPriceToman);
      if (seen.has(row.variantId)) throw new DomainError('EXCEL_PRICE_VARIANT_DUPLICATE', 'برای یک واریانت بیش از یک قیمت در workbook وجود دارد.');
      seen.add(row.variantId);
      const current = await this.repo.currentBasePrice(row.variantId);
      const currentPrice = current ? Number(current.amount_toman) : null;
      const guard = currentPrice !== null && row.proposedPriceToman < currentPrice
        ? await this.guard.evaluate(row.variantId, row.proposedPriceToman)
        : { status: 'not_required', reason: null };
      items.push({
        ...row,
        currentBasePriceId: current ? String(current.id) : null,
        currentPriceToman: currentPrice,
        guardStatus: String(guard.status),
        guardReason: guard.reason == null ? null : String(guard.reason),
      });
    }
    items.sort((a, b) => a.variantId.localeCompare(b.variantId));
    return { sourceFingerprint, items, previewHash: this.hash(sourceFingerprint, items) };
  }

  async apply(preview: PricingImportPreview, expectedPreviewHash: string): Promise<{ affectedCount: number }> {
    if (this.hash(preview.sourceFingerprint, preview.items) !== expectedPreviewHash || preview.previewHash !== expectedPreviewHash) {
      throw new DomainError('EXCEL_PRICING_PREVIEW_MISMATCH', 'پیش‌نمایش قیمت با درخواست Apply مطابقت ندارد.');
    }
    const context = this.ctx.require();
    let affectedCount = 0;
    await this.tx.run(async (trx) => {
      const effectiveAt = new Date();
      for (const item of preview.items) {
        this.validateMoney(item.proposedPriceToman);
        const current = await this.repo.currentBasePrice(item.variantId, effectiveAt, trx);
        const currentId = current ? String(current.id) : null;
        const currentAmount = current ? Number(current.amount_toman) : null;
        if (currentId !== item.currentBasePriceId || currentAmount !== item.currentPriceToman) {
          throw new DomainError('PRICE_CHANGED_SINCE_PREVIEW', 'قیمت یکی از اقلام پس از پیش‌نمایش تغییر کرده است.', { variant_id: item.variantId });
        }
        if (item.guardStatus === 'blocked' || item.guardStatus === 'unavailable') {
          throw new DomainError('PROFIT_GUARD_FAILED', 'اعمال قیمت به دلیل کنترل سود متوقف شد.', { variant_id: item.variantId, reason: item.guardReason });
        }
        if (currentAmount === item.proposedPriceToman) continue;
        if (currentAmount !== null && item.proposedPriceToman < currentAmount) {
          const freshGuard = await this.guard.evaluate(item.variantId, item.proposedPriceToman);
          if (freshGuard.status !== 'passed') {
            throw new DomainError('PROFIT_GUARD_FAILED', 'اعمال قیمت به دلیل کنترل سود متوقف شد.', { variant_id: item.variantId, reason: freshGuard.reason });
          }
        }
        await this.repo.closeBasePriceAt(trx, item.variantId, effectiveAt);
        const id = randomUUID();
        await this.repo.insertBasePrice(trx, {
          id,
          variantId: item.variantId,
          amountToman: item.proposedPriceToman,
          sourceType: 'excel_import',
          validFrom: effectiveAt,
          validUntil: null,
          createdBy: context.actor.id ?? null,
        });
        const payload = {
          base_price_id: id,
          variant_id: item.variantId,
          sku: item.sku,
          old_price_toman: currentAmount,
          new_price_toman: item.proposedPriceToman,
          source_fingerprint: preview.sourceFingerprint,
          effective_at: effectiveAt.toISOString(),
        };
        await this.outbox.append(trx, [{
          eventType: 'pricing.base_price.changed.v1',
          eventVersion: 1,
          aggregateType: 'base_price',
          aggregateId: id,
          aggregateVersion: 1,
          occurredAt: effectiveAt,
          payload,
        }], context);
        await this.audit.writeWith(trx, {
          actorType: context.actor.type,
          actorId: context.actor.id,
          action: 'pricing.base-price.excel_apply',
          resourceType: 'base_price',
          resourceId: id,
          afterData: payload,
          requestId: context.requestId,
          traceId: context.traceId,
        });
        affectedCount += 1;
      }
    });
    return { affectedCount };
  }

  private hash(sourceFingerprint: string, items: PricingImportPreviewItem[]): string {
    return createHash('sha256').update(JSON.stringify({
      sourceFingerprint,
      items: [...items].sort((a, b) => a.variantId.localeCompare(b.variantId)).map((item) => ({
        variantId: item.variantId,
        sku: item.sku,
        proposedPriceToman: item.proposedPriceToman,
        currentBasePriceId: item.currentBasePriceId,
        currentPriceToman: item.currentPriceToman,
        guardStatus: item.guardStatus,
        guardReason: item.guardReason,
      })),
    }), 'utf8').digest('hex');
  }

  private validateMoney(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) throw new DomainError('INVALID_MONEY', 'قیمت باید عدد صحیح تومان و غیرمنفی باشد.');
  }
}
