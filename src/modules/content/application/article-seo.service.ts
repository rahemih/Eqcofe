import { Inject, Injectable } from '@nestjs/common';
import { STORE_CONFIGURATION_PORT, StoreConfigurationPort } from '../../configuration/application/ports/store-configuration.port';
import { DomainError } from '../../../shared/errors/domain-error';
import { ArticleStatus } from '../infrastructure/content.repository';

export interface ArticleSeoSource {
  slug: string;
  title_fa: string;
  seo_title: string | null;
  meta_description: string | null;
  body?: string | null;
}

export interface ArticleSeoLifecycleSource extends ArticleSeoSource {
  status: ArticleStatus;
  hasPublishedVersion: boolean;
}

export interface ArticleSeoMetadata {
  title: string;
  description: string | null;
  canonical_url: string | null;
  indexable: boolean;
  robots: 'index,follow' | 'noindex,nofollow';
}

@Injectable()
export class ArticleSeoService {
  constructor(@Inject(STORE_CONFIGURATION_PORT) private readonly settings: StoreConfigurationPort) {}

  async publicBaseUrl(): Promise<string> {
    let candidate = 'https://eqcofe.com';
    try {
      const configured = await this.settings.get<string>('content.public_base_url');
      if (typeof configured === 'string' && configured.trim()) candidate = configured.trim();
    } catch {
      // Missing configuration intentionally falls back to the canonical production host.
    }

    try {
      const url = new URL(candidate);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('invalid');
      url.pathname = '/';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch {
      throw new DomainError('CONTENT_CANONICAL_BASE_URL_INVALID', 'آدرس پایه عمومی محتوا معتبر نیست.');
    }
  }

  private validSlug(slug: string): string {
    const value = String(slug ?? '').trim().toLowerCase();
    if (!value || value.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      throw new DomainError('CONTENT_CANONICAL_SLUG_INVALID', 'شناسه نشانی مقاله برای سئو معتبر نیست.');
    }
    return value;
  }

  private normalizedText(value: string | null | undefined, max: number): string | null {
    if (!value) return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, max) : null;
  }

  private plainBody(body: string | null | undefined): string | null {
    if (!body) return null;
    const plain = body
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[#*_`>\[\](){}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return this.normalizedText(plain, 500);
  }

  private title(row: ArticleSeoSource): string {
    const value = this.normalizedText(row.seo_title, 300) ?? this.normalizedText(row.title_fa, 300);
    if (!value) throw new DomainError('CONTENT_SEO_TITLE_EMPTY', 'عنوان سئوی مقاله نمی‌تواند خالی باشد.');
    return value;
  }

  private description(row: ArticleSeoSource): string | null {
    return this.normalizedText(row.meta_description, 500) ?? this.plainBody(row.body);
  }

  async canonicalUrlForSlug(slugRaw: string): Promise<string> {
    const base = await this.publicBaseUrl();
    const slug = this.validSlug(slugRaw);
    return `${base}/articles/${slug}`;
  }

  async forPublicArticle(row: ArticleSeoSource): Promise<ArticleSeoMetadata> {
    const base = await this.publicBaseUrl();
    const slug = this.validSlug(row.slug);
    return {
      title: this.title(row),
      description: this.description(row),
      canonical_url: `${base}/articles/${slug}`,
      indexable: true,
      robots: 'index,follow',
    };
  }

  async forLifecycle(row: ArticleSeoLifecycleSource): Promise<ArticleSeoMetadata> {
    const indexable = row.status === 'published' && row.hasPublishedVersion;
    if (indexable) return this.forPublicArticle(row);
    return {
      title: this.title(row),
      description: this.description(row),
      canonical_url: null,
      indexable: false,
      robots: 'noindex,nofollow',
    };
  }
}
