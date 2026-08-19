export const MEDIA_STORAGE_PORT = Symbol('MEDIA_STORAGE_PORT');

export type MediaUploadRequest = {
  mediaId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type MediaUploadTarget = {
  method: 'PUT';
  url: string;
  expiresAt: Date;
};

export interface MediaStoragePort {
  createUploadTarget(input: MediaUploadRequest): Promise<MediaUploadTarget>;
}
