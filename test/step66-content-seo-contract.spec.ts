import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ArticlePublicQueryService } from '../src/modules/content/application/article-public-query.service';
import { ArticleSitemapService } from '../src/modules/content/application/article-sitemap.service';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service';

test('Step 66-B public Article contracts are typed and preserve published-only authority',()=>{
  const api=readFileSync('contracts/http/openapi.yaml','utf8');
  const generated=readFileSync('src/generated/openapi.ts','utf8');
  assert.match(api,/ArticleSeoMetadata:/);
  assert.match(api,/ArticleListResponse:/);
  assert.match(api,/ArticleDetail:/);
  assert.match(api,/ArticleRelatedResponse:/);
  assert.match(api,/operationId: getArticles[\s\S]*ArticleListResponse/);
  assert.match(api,/operationId: getArticlesSlug[\s\S]*ArticleDetail/);
  assert.match(api,/operationId: getArticlesSlugRelated[\s\S]*ArticleRelatedResponse/);
  assert.match(generated,/"application\/json": components\["schemas"\]\["ArticleListResponse"\]/);
  assert.match(generated,/"application\/json": components\["schemas"\]\["ArticleDetail"\]/);
  assert.match(generated,/"application\/json": components\["schemas"\]\["ArticleRelatedResponse"\]/);
});

test('Step 66-B Article and sitemap cursors are bounded before decode',async()=>{
  const pub=new ArticlePublicQueryService({listPublicArticles:async()=>[]} as any,{forPublicArticle:async()=>({})} as any);
  const sitemap=new ArticleSitemapService({listSitemapArticles:async()=>[]} as any,{canonicalUrlForSlug:async()=>''} as any);
  await assert.rejects(()=>pub.list({cursor:'x'.repeat(1025)}),(e:any)=>e.code==='CONTENT_PUBLIC_CURSOR_INVALID');
  await assert.rejects(()=>sitemap.list({cursor:'x'.repeat(1025)}),(e:any)=>e.code==='CONTENT_SITEMAP_CURSOR_INVALID');
});

test('Step 66-B exposes published-article sitemap data but keeps robots resource Storefront-owned',()=>{
  const api=readFileSync('contracts/http/openapi.yaml','utf8');
  const controller=readFileSync('src/modules/content/presentation/content-discovery.controller.ts','utf8');
  assert.match(controller,/@Controller\('content'\)/);
  assert.match(controller,/@Get\('sitemap\/articles'\)/);
  assert.match(api,/\/content\/sitemap\/articles:[\s\S]*ArticleSitemapResponse/);
  assert.doesNotMatch(api,/\/content\/robots:/);
});

test('Step 66-B archive public read excludes never-published and admin-only archive reason',()=>{
  const repo=readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  const api=readFileSync('contracts/http/openapi.yaml','utf8');
  assert.match(repo,/p\.status='archived' AND p\.published_at IS NOT NULL AND p\.archived_at IS NOT NULL/);
  assert.match(api,/ArchivedProductCard:/);
  const schema=api.slice(api.indexOf('    ArchivedProductCard:'),api.indexOf('    ArchivedProductListResponse:'));
  assert.doesNotMatch(schema,/archive_reason/);
  assert.match(api,/\/catalog\/archive:[\s\S]*ArchivedProductListResponse/);
});

test('Step 66-B stop-sale read is effective-sales state, not out-of-stock state',async()=>{
  const row={id:'11111111-1111-4111-8111-111111111111',slug:'stopped',name_fa:'محصول',brand_id:null,category_id:'22222222-2222-4222-8222-222222222222',category_name:'دسته',category_slug:'tools',effective_sales_enabled:false,created_at:new Date('2026-10-01T00:00:00Z')};
  const repo:any={listPublicStoppedSale:async()=>({data:[row],nextCursor:null,hasMore:false}),listSellableVariantsForProducts:async()=>[],publicAttributeValues:async()=>[]};
  const pricing:any={getProductPrices:async()=>({[row.id]:{current_toman:100000,old_toman:null,discount_percent:null}})};
  const inventory:any={getOnlineSellableQuantities:async()=>({})};
  const out:any=await new CatalogQueryService(repo,pricing,inventory).stopSale({});
  assert.equal(out.items[0].availability.sales_enabled,false);
  assert.equal(out.items[0].availability.in_stock,false);
  const source=readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  assert.match(source,/p\.status='published' AND NOT \(s\.global_sales_enabled/);
});

test('Step 66-B archive projection is bounded and contains no stale price or sale authority',async()=>{
  const repo:any={listPublicArchived:async()=>({data:[{id:'11111111-1111-4111-8111-111111111111',slug:'old',name_fa:'قدیمی',brand_id:null,category_id:'22222222-2222-4222-8222-222222222222',category_name:'دسته',category_slug:'tools',archived_at:new Date('2026-10-01T00:00:00Z'),archive_reason:'internal'}],nextCursor:null,hasMore:false})};
  const out:any=await new CatalogQueryService(repo,{} as any,{} as any).archive({});
  assert.equal(out.items[0].slug,'old');
  assert.equal('archive_reason' in out.items[0],false);
  assert.equal('price' in out.items[0],false);
  assert.equal('availability' in out.items[0],false);
});

test('Step 66-B generated OpenAPI is byte-for-byte reproducible from canonical source',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step66-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    const actual=readFileSync('src/generated/openapi.ts','utf8');
    const expected=readFileSync(output,'utf8');
    if(actual!==expected){
      const a=actual.split('\n'),e=expected.split('\n'),diffs:string[]=[];
      for(let i=0;i<Math.max(a.length,e.length)&&diffs.length<160;i++) if(a[i]!==e[i]) diffs.push(`L${i+1} CURRENT=${JSON.stringify(a[i]??'')} EXPECTED=${JSON.stringify(e[i]??'')}`);
      assert.fail(`generated OpenAPI drift (first ${diffs.length} differing lines)\n${diffs.join('\n')}`);
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
