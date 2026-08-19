from pathlib import Path
seo=Path('src/modules/content/application/article-seo.service.ts').read_text()
public=Path('src/modules/content/application/article-public-query.service.ts').read_text()
repo=Path('src/modules/content/infrastructure/content.repository.ts').read_text()
reg=Path('src/modules/configuration/domain/configuration.registry.ts').read_text()
checks={
'config key':"content.public_base_url" in reg,
'seo service':Path('src/modules/content/application/article-seo.service.ts').exists(),
'https canonical':"url.protocol !== 'https:'" in seo,
'no canonical credentials':"url.username || url.password" in seo,
'canonical articles path':"${base}/articles/${slug}" in seo,
'canonical slug guard':"CONTENT_CANONICAL_SLUG_INVALID" in seo,
'robots index follow':"robots: 'index,follow'" in seo,
'robots noindex':"robots: 'noindex,nofollow'" in seo,
'lifecycle derived indexability':"row.status === 'published' && row.hasPublishedVersion" in seo,
'nonpublic canonical null':"canonical_url: null" in seo,
'seo fallback title':"this.normalizedText(row.seo_title, 300) ?? this.normalizedText(row.title_fa, 300)" in seo,
'meta fallback body':"this.normalizedText(row.meta_description, 500) ?? this.plainBody(row.body)" in seo,
'script stripped':"replace(/<script" in seo,
'public query uses seo':"this.seo.forPublicArticle(row)" in public,
'public remains published version':"published_version_id" in repo,
'public published status':"a.status='published'" in repo,
'no caller index flag':"indexable:" not in public,
'no sitemap implementation':not Path('src/modules/content/application/sitemap.service.ts').exists(),
'no category tag':not Path('src/modules/content/domain/category.ts').exists(),
'no redirect history invented':not Path('src/modules/content/infrastructure/article-slug-redirect.repository.ts').exists(),
}
failed=[k for k,v in checks.items() if not v]
print(f"step45-a7-audit: {len(checks)-len(failed)}/{len(checks)} PASS")
if failed:
 print('FAILED:',failed);raise SystemExit(1)
