import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { ContentRepository, SitemapArticleRow } from '../infrastructure/content.repository';
import { ArticleSeoService } from './article-seo.service';

export interface SitemapPageQuery { cursor?: string; limit?: number; }

@Injectable()
export class ArticleSitemapService {
  constructor(private readonly repo: ContentRepository, private readonly seo: ArticleSeoService) {}

  private limit(value: unknown): number {
    if (value === undefined || value === null || value === '') return 500;
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > 1000) {
      throw new DomainError('CONTENT_SITEMAP_LIMIT_INVALID', 'محدوده تعداد نشانی‌های سایت‌مپ معتبر نیست.');
    }
    return n;
  }

  private cursor(value: unknown): { publishedAt: Date; id: string } | null {
    if (value === undefined || value === null || value === '') return null;
    let decoded = '';
    try { decoded = Buffer.from(String(value), 'base64url').toString('utf8'); }
    catch { throw new DomainError('CONTENT_SITEMAP_CURSOR_INVALID', 'نشانگر سایت‌مپ معتبر نیست.'); }
    const sep = decoded.indexOf('|');
    if (sep <= 0) throw new DomainError('CONTENT_SITEMAP_CURSOR_INVALID', 'نشانگر سایت‌مپ معتبر نیست.');
    const publishedAt = new Date(decoded.slice(0, sep));
    const id = decoded.slice(sep + 1);
    if (!Number.isFinite(publishedAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new DomainError('CONTENT_SITEMAP_CURSOR_INVALID', 'نشانگر سایت‌مپ معتبر نیست.');
    }
    return { publishedAt, id };
  }

  private nextCursor(row: SitemapArticleRow | undefined): string | null {
    if (!row) return null;
    return Buffer.from(`${row.published_at.toISOString()}|${row.id}`, 'utf8').toString('base64url');
  }

  async list(query: SitemapPageQuery = {}) {
    const limit = this.limit(query.limit);
    const cursor = this.cursor(query.cursor);
    const rows = await this.repo.listSitemapArticles({ limit: limit + 1, cursor });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: await Promise.all(items.map(async row => ({
        loc: await this.seo.canonicalUrlForSlug(row.slug),
        lastmod: row.published_at.toISOString(),
      }))),
      next_cursor: hasMore ? this.nextCursor(items.at(-1)) : null,
    };
  }
}
