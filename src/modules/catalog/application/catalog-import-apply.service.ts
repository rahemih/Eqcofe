import { Inject, Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { PRICING_PUBLIC_PORT, PricingPublicPort } from '../../pricing/application/ports/pricing-public.port';
import { CatalogRepository } from '../infrastructure/catalog.repository';

export interface CatalogImportProductOperation {
  id: string;
  expectedVersion: number;
  nameFa?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface CatalogImportVariantOperation {
  id: string;
  expectedVersion: number;
  barcode?: string | null;
}

export interface CatalogImportApplyCommand {
  products: CatalogImportProductOperation[];
  variants: CatalogImportVariantOperation[];
  sourceFingerprint: string;
}

@Injectable()
export class CatalogImportApplyService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repo: CatalogRepository,
    private readonly outbox: OutboxWriter,
    private readonly audit: AuditWriter,
    private readonly ctx: RequestContextStore,
    @Inject(PRICING_PUBLIC_PORT) private readonly pricing: PricingPublicPort,
  ) {}

  async apply(command: CatalogImportApplyCommand): Promise<{ products: number; variants: number }> {
    const context = this.ctx.require();
    const auditReason = `excel-import:${command.sourceFingerprint}`;
    await this.tx.run(async (trx) => {
      for (const operation of command.products) {
        const product = await this.repo.productById(trx, operation.id, true);
        if (!product) throw new DomainError('PRODUCT_NOT_FOUND', 'محصول پیدا نشد.');
        if (product.version !== operation.expectedVersion) throw new DomainError('VERSION_CONFLICT', 'نسخه محصول تغییر کرده است.');
        const before = product.snapshot();
        if (operation.nameFa !== undefined && operation.nameFa !== before.nameFa) product.update({ nameFa: operation.nameFa });
        if (operation.status !== undefined && operation.status !== product.status) {
          if (operation.status === 'published') {
            const hasVariant = await this.repo.hasActiveVariant(trx, product.id);
            const hasPrice = await this.pricing.hasSellablePrice(product.id);
            product.publish(hasVariant, hasPrice);
          } else if (operation.status === 'archived') {
            product.archive('excel-import');
          } else if (product.status === 'archived') {
            product.unarchive();
          } else {
            throw new DomainError('INVALID_STATE_TRANSITION', 'تغییر وضعیت محصول از مسیر Excel با وضعیت فعلی مجاز نیست.');
          }
        }
        if (product.version !== operation.expectedVersion) {
          await this.repo.saveProduct(trx, product, operation.expectedVersion);
          await this.outbox.append(trx, product.pullEvents(), context);
          await this.audit.writeWith(trx, {
            actorType: context.actor.type,
            actorId: context.actor.id,
            action: 'catalog.product.excel_apply',
            resourceType: 'product',
            resourceId: product.id,
            beforeData: before,
            afterData: product.snapshot(),
            reason: auditReason,
            requestId: context.requestId,
            traceId: context.traceId,
          });
        }
      }

      for (const operation of command.variants) {
        const variant = await this.repo.variantById(trx, operation.id, true);
        if (!variant) throw new DomainError('VARIANT_NOT_FOUND', 'واریانت پیدا نشد.');
        if (variant.version !== operation.expectedVersion) throw new DomainError('VERSION_CONFLICT', 'نسخه واریانت تغییر کرده است.');
        const before = variant.snapshot();
        if (operation.barcode !== undefined && operation.barcode !== before.barcode) variant.update({ barcode: operation.barcode });
        if (variant.version !== operation.expectedVersion) {
          await this.repo.saveVariant(trx, variant, operation.expectedVersion);
          await this.outbox.append(trx, variant.pullEvents(), context);
          await this.audit.writeWith(trx, {
            actorType: context.actor.type,
            actorId: context.actor.id,
            action: 'catalog.variant.excel_apply',
            resourceType: 'variant',
            resourceId: variant.id,
            beforeData: before,
            afterData: variant.snapshot(),
            reason: auditReason,
            requestId: context.requestId,
            traceId: context.traceId,
          });
        }
      }
    });
    return { products: command.products.length, variants: command.variants.length };
  }
}
