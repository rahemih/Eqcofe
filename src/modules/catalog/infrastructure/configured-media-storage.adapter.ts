import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { MediaStoragePort, MediaUploadRequest, MediaUploadTarget } from '../application/ports/media-storage.port';

@Injectable()
export class ConfiguredMediaStorageAdapter implements MediaStoragePort {
  constructor(private readonly config: ConfigService) {}

  async createUploadTarget(input: MediaUploadRequest): Promise<MediaUploadTarget> {
    const baseUrl = this.config.get<string>('MEDIA_UPLOAD_BASE_URL');
    const secret = this.config.get<string>('MEDIA_UPLOAD_SIGNING_SECRET');
    if (!baseUrl || !secret) {
      throw new DomainError('MEDIA_STORAGE_NOT_CONFIGURED', 'سرویس ذخیره‌سازی رسانه پیکربندی نشده است.');
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const expiresEpochMs = expiresAt.getTime();
    const canonical = [input.mediaId, input.storageKey, input.mimeType, input.sizeBytes, input.checksumSha256, expiresEpochMs].join('\n');
    const signature = createHmac('sha256', secret).update(canonical).digest('base64url');
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(input.mediaId)}${separator}exp=${expiresEpochMs}&sig=${signature}`;
    return { method: 'PUT', url, expiresAt };
  }
}
