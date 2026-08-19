import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { ContentRepository, PublicArticleDetailRow } from '../infrastructure/content.repository';
import { ArticleSeoService } from './article-seo.service';

export interface InternalArticleLink {
  slug: string;
  article_id: string;
  canonical_url: string;
  anchor_text: string | null;
}

export interface InternalLinkInspection {
  source_article_id: string;
  source_slug: string;
  content_version: number;
  valid: InternalArticleLink[];
  broken: Array<{ slug: string; anchor_text: string | null }>;
  self: Array<{ slug: string; anchor_text: string | null }>;
  external_ignored: number;
}

interface ExtractedLink { href: string; anchorText: string | null; }

@Injectable()
export class ArticleInternalLinkService {
  constructor(private readonly repo: ContentRepository, private readonly seo: ArticleSeoService) {}

  private cleanAnchor(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, 300) : null;
  }

  private extract(body: string | null | undefined): ExtractedLink[] {
    if (!body) return [];
    const out: ExtractedLink[] = [];
    const markdown = /\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    for (const match of body.matchAll(markdown)) {
      out.push({ href: match[2] ?? '', anchorText: this.cleanAnchor(match[1]) });
    }
    const html = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of body.matchAll(html)) {
      out.push({ href: match[2] ?? '', anchorText: this.cleanAnchor(match[3]) });
    }
    return out;
  }

  private async articleSlugFromHref(hrefRaw: string): Promise<{ slug: string | null; external: boolean }> {
    const href = String(hrefRaw ?? '').trim();
    if (!href || href.startsWith('#')) return { slug: null, external: false };
    const base = await this.seo.publicBaseUrl();
    let url: URL;
    try {
      url = new URL(href, `${base}/`);
    } catch {
      return { slug: null, external: false };
    }
    const baseUrl = new URL(base);
    if (url.origin !== baseUrl.origin) return { slug: null, external: true };
    const match = url.pathname.match(/^\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
    return { slug: match?.[1] ?? null, external: false };
  }

  async inspectPublishedArticle(slugRaw: string): Promise<InternalLinkInspection> {
    const slug = String(slugRaw ?? '').trim().toLowerCase();
    if (!slug || slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new DomainError('CONTENT_ARTICLE_NOT_FOUND', 'مقاله پیدا نشد.');
    }
    const source = await this.repo.publicArticleBySlug(slug);
    if (!source) throw new DomainError('CONTENT_ARTICLE_NOT_FOUND', 'مقاله پیدا نشد.');
    return this.inspectRow(source);
  }

  async inspectRow(source: PublicArticleDetailRow): Promise<InternalLinkInspection> {
    const seen = new Set<string>();
    const valid: InternalArticleLink[] = [];
    const broken: Array<{ slug: string; anchor_text: string | null }> = [];
    const self: Array<{ slug: string; anchor_text: string | null }> = [];
    let externalIgnored = 0;

    for (const extracted of this.extract(source.body)) {
      const parsed = await this.articleSlugFromHref(extracted.href);
      if (parsed.external) { externalIgnored += 1; continue; }
      if (!parsed.slug || seen.has(parsed.slug)) continue;
      seen.add(parsed.slug);
      if (parsed.slug === source.slug) {
        self.push({ slug: parsed.slug, anchor_text: extracted.anchorText });
        continue;
      }
      const target = await this.repo.publicArticleBySlug(parsed.slug);
      if (!target) {
        broken.push({ slug: parsed.slug, anchor_text: extracted.anchorText });
        continue;
      }
      valid.push({
        slug: target.slug,
        article_id: target.id,
        canonical_url: await this.seo.canonicalUrlForSlug(target.slug),
        anchor_text: extracted.anchorText,
      });
    }

    return {
      source_article_id: source.id,
      source_slug: source.slug,
      content_version: source.version_number,
      valid,
      broken,
      self,
      external_ignored: externalIgnored,
    };
  }
}
