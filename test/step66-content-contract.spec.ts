import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Step 66-B public Article OpenAPI is typed from current runtime fields only',()=>{
  const openapi=readFileSync('contracts/http/openapi.yaml','utf8');
  const generated=readFileSync('src/generated/openapi.ts','utf8');
  for(const schema of ['ArticleSeoMetadata','PublicArticleSummary','PublicArticleDetail','PublicArticleListResponse','PublicArticleRelatedResponse']){
    assert.match(openapi,new RegExp('\\n    '+schema+':'));
    assert.match(generated,new RegExp('\\n        '+schema+':'));
  }
  assert.match(openapi,/operationId: getArticles[\s\S]*PublicArticleListResponse/);
  assert.match(openapi,/operationId: getArticlesSlug[\s\S]*PublicArticleDetail/);
  assert.match(openapi,/operationId: getArticlesSlugRelated[\s\S]*PublicArticleRelatedResponse/);
  assert.doesNotMatch(openapi,/PublicArticle(?:Summary|Detail):[\s\S]{0,1800}\b(author|category|tag|structured_data)\b/i);
});

test('Step 66-B keeps published-only runtime and backend-owned SEO authority',()=>{
  const query=readFileSync('src/modules/content/application/article-public-query.service.ts','utf8');
  const repo=readFileSync('src/modules/content/infrastructure/content.repository.ts','utf8');
  const seo=readFileSync('src/modules/content/application/article-seo.service.ts','utf8');
  assert.match(repo,/a\.status='published'/);
  assert.match(repo,/JOIN content\.article_versions v ON v\.id=a\.published_version_id/);
  assert.match(query,/forPublicArticle/);
  assert.match(seo,/canonical_url:/);
  assert.match(seo,/robots: 'index,follow'/);
});

test('Step 66-B freezes sitemap/robots and archive/stop-sale boundaries without invented APIs',()=>{
  const openapi=readFileSync('contracts/http/openapi.yaml','utf8');
  const controller=readFileSync('src/modules/content/presentation/content-public.controller.ts','utf8');
  assert.doesNotMatch(openapi,/\/sitemap\.xml:|\/robots\.txt:/);
  assert.doesNotMatch(controller,/sitemap|robots/i);
  assert.doesNotMatch(openapi,/\/products\/(archive|archived|stop-sale|stopped-sale):/);
});

test('Step 66-B generated OpenAPI is byte-for-byte reproducible from canonical source',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step66-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    assert.equal(readFileSync('src/generated/openapi.ts','utf8'),readFileSync(output,'utf8'));
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});
