import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { ContentRepository, PublicArticleDetailRow, PublicArticleSummaryRow } from '../infrastructure/content.repository';
import { ArticleSeoService } from './article-seo.service';

export interface PublicArticleListQuery {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ArticlePublicQueryService {
  constructor(private readonly repo: ContentRepository, private readonly seo: ArticleSeoService) {}

  private limit(value: unknown, fallback: number, max: number): number {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > max) {
      throw new DomainError('CONTENT_PUBLIC_LIMIT_INVALID', 'محدوده تعداد مقالات معتبر نیست.');
    }
    return n;
  }

  private cursor(value: unknown): { publishedAt: Date; id: string } | null {
    if (value === undefined || value === null || value === '') return null;
    let decoded = '';
    try { decoded = Buffer.from(String(value), 'base64url').toString('utf8'); }
    catch { throw new DomainError('CONTENT_PUBLIC_CURSOR_INVALID', 'نشانگر صفحه مقالات معتبر نیست.'); }
    const sep = decoded.indexOf('|');
    if (sep <= 0) throw new DomainError('CONTENT_PUBLIC_CURSOR_INVALID', 'نشانگر صفحه مقالات معتبر نیست.');
    const publishedAt = new Date(decoded.slice(0, sep));
    const id = decoded.slice(sep + 1);
    if (!Number.isFinite(publishedAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new DomainError('CONTENT_PUBLIC_CURSOR_INVALID', 'نشانگر صفحه مقالات معتبر نیست.');
    }
    return { publishedAt, id };
  }

  private nextCursor(row: PublicArticleSummaryRow | undefined): string | null {
    if (!row) return null;
    return Buffer.from(`${row.published_at.toISOString()}|${row.id}`, 'utf8').toString('base64url');
  }

  async list(query: PublicArticleListQuery = {}) {
    const limit = this.limit(query.limit, 20, 100);
    const cursor = this.cursor(query.cursor);
    const rows = await this.repo.listPublicArticles({ limit: limit + 1, cursor });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: await Promise.all(items.map((row) => this.summary(row))),
      next_cursor: hasMore ? this.nextCursor(items.at(-1)) : null,
    };
  }

  async getBySlug(slug: string) {
    const normalized = String(slug ?? '').trim().toLowerCase();
    if (!normalized || normalized.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      throw new DomainError('CONTENT_ARTICLE_NOT_FOUND', 'مقاله پیدا نشد.');
    }
    const row = await this.repo.publicArticleBySlug(normalized);
    if (!row) throw new DomainError('CONTENT_ARTICLE_NOT_FOUND', 'مقاله پیدا نشد.');
    return this.detail(row);
  }

  async related(slug: string, requestedLimit?: number) {
    const article = await this.getBySlug(slug);
    const limit = this.limit(requestedLimit, 6, 20);
    const rows = await this.repo.relatedPublicArticles(article.id, limit);
    return { items: await Promise.all(rows.map((row) => this.summary(row))) };
  }

  private async summary(row: PublicArticleSummaryRow) {
    const seo=await this.seo.forPublicArticle(row);
    return {
      id: row.id,
      slug: row.slug,
      title_fa: row.title_fa,
      seo_title: row.seo_title,
      meta_description: row.meta_description,
      published_at: row.published_at,
      seo,
    };
  }

  private async detail(row: PublicArticleDetailRow) {
    return {
      ...(await this.summary(row)),
      body: row.body,
      content_version: row.version_number,
    };
  }
}
