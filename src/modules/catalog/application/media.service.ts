import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { CatalogRepository } from '../infrastructure/catalog.repository';
import { MEDIA_STORAGE_PORT, MediaStoragePort } from './ports/media-storage.port';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

@Injectable()
export class MediaService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repo: CatalogRepository,
    private readonly audit: AuditWriter,
    private readonly ctx: RequestContextStore,
    @Inject(MEDIA_STORAGE_PORT) private readonly storage: MediaStoragePort,
  ) {}

  async request(input: unknown) {
    const i = (input ?? {}) as Record<string, unknown>;
    const filename = String(i.filename ?? '').trim();
    const mime = String(i.mime_type ?? '');
    const size = Number(i.size_bytes);
    if (!filename || !allowed.has(mime) || !Number.isInteger(size) || size <= 0 || size > 50 * 1024 * 1024) {
      throw new DomainError('INVALID_MEDIA_UPLOAD', 'فایل رسانه معتبر نیست.');
    }
    const checksum = String(i.checksum_sha256 ?? '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(checksum)) throw new DomainError('INVALID_CHECKSUM', 'SHA-256 معتبر نیست.');

    const id = randomUUID();
    const extension = filename.includes('.') ? filename.split('.').at(-1)!.toLowerCase() : 'bin';
    const key = `catalog/${id}.${extension}`;
    const c = this.ctx.require();

    await this.tx.run(async (trx) => {
      await this.repo.createMedia(trx, { id, storageKey: key, filename, mimeType: mime, sizeBytes: size, checksum, createdBy: c.actor.id });
      await this.audit.writeWith(trx, {
        actorType: c.actor.type,
        actorId: c.actor.id,
        action: 'catalog.media.upload-request',
        resourceType: 'media',
        resourceId: id,
        afterData: { storage_key: key, mime_type: mime, size_bytes: size, checksum_sha256: checksum },
        requestId: c.requestId,
      });
    });

    const upload = await this.storage.createUploadTarget({ mediaId: id, storageKey: key, mimeType: mime, sizeBytes: size, checksumSha256: checksum });
    return { id, storage_key: key, upload: { method: upload.method, url: upload.url, expires_at: upload.expiresAt } };
  }

  async complete(id: string, input: unknown) {
    const i = (input ?? {}) as Record<string, unknown>;
    const c = this.ctx.require();
    await this.tx.run(async (trx) => {
      const width = i.width == null ? null : Number(i.width);
      const height = i.height == null ? null : Number(i.height);
      if (width != null && (!Number.isInteger(width) || width <= 0)) throw new DomainError('VALIDATION_ERROR', 'عرض رسانه معتبر نیست.');
      if (height != null && (!Number.isInteger(height) || height <= 0)) throw new DomainError('VALIDATION_ERROR', 'ارتفاع رسانه معتبر نیست.');
      await this.repo.completeMedia(trx, id, width, height);
      await this.audit.writeWith(trx, { actorType: c.actor.type, actorId: c.actor.id, action: 'catalog.media.complete', resourceType: 'media', resourceId: id, requestId: c.requestId });
    });
    return this.repo.mediaById(id);
  }

  async approve(id: string) {
    const c = this.ctx.require();
    await this.tx.run(async (trx) => {
      await this.repo.activateMedia(trx, id);
      await this.audit.writeWith(trx, { actorType: c.actor.type, actorId: c.actor.id, action: 'catalog.media.approve', resourceType: 'media', resourceId: id, requestId: c.requestId });
    });
    return this.repo.mediaById(id);
  }

  async reject(id: string) {
    const c = this.ctx.require();
    await this.tx.run(async (trx) => {
      await this.repo.rejectMedia(trx, id);
      await this.audit.writeWith(trx, { actorType: c.actor.type, actorId: c.actor.id, action: 'catalog.media.reject', resourceType: 'media', resourceId: id, requestId: c.requestId });
    });
    return this.repo.mediaById(id);
  }

  get(id: string) { return this.repo.mediaById(id); }

  async remove(id: string) {
    const c = this.ctx.require();
    await this.tx.run(async (trx) => {
      await this.repo.deleteMedia(trx, id);
      await this.audit.writeWith(trx, { actorType: c.actor.type, actorId: c.actor.id, action: 'catalog.media.delete', resourceType: 'media', resourceId: id, requestId: c.requestId });
    });
    return { deleted: true };
  }
}
