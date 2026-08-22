import assert from 'node:assert/strict';
import { ArticleInternalLinkService } from '../src/modules/content/application/article-internal-link.service';
import { ArticleSitemapService } from '../src/modules/content/application/article-sitemap.service';

async function main(){
  const source:any={id:'00000000-0000-4000-8000-000000000001',slug:'source',title_fa:'منبع',seo_title:null,meta_description:null,published_at:new Date('2026-01-03T00:00:00Z'),body:'[معتبر](/articles/target) [خراب](/articles/missing) [خود](/articles/source) [بیرونی](https://example.com/articles/x) <a href="https://eqcofe.com/articles/target">تکراری</a>',version_number:4};
  const target:any={id:'00000000-0000-4000-8000-000000000002',slug:'target',title_fa:'هدف',seo_title:null,meta_description:null,published_at:new Date('2026-01-02T00:00:00Z'),body:'x',version_number:2};
  const repo:any={publicArticleBySlug:async(slug:string)=>slug==='source'?source:slug==='target'?target:null};
  const seo:any={publicBaseUrl:async()=> 'https://eqcofe.com',canonicalUrlForSlug:async(slug:string)=>`https://eqcofe.com/articles/${slug}`};
  const links=new ArticleInternalLinkService(repo,seo);
  {const out=await links.inspectPublishedArticle('source');assert.equal(out.valid.length,1);assert.equal(out.valid[0].slug,'target');assert.equal(out.broken[0].slug,'missing');assert.equal(out.self[0].slug,'source');assert.equal(out.external_ignored,1);assert.equal(out.content_version,4);}
  {await assert.rejects(()=>links.inspectPublishedArticle('../bad'),(e:any)=>e.code==='CONTENT_ARTICLE_NOT_FOUND');}
  {const badSource={...source,body:'[scheduled](/articles/not-public)'};const out=await links.inspectRow(badSource);assert.equal(out.valid.length,0);assert.equal(out.broken[0].slug,'not-public');}

  const sitemapRepo:any={listSitemapArticles:async({limit,cursor}:any)=>{
    assert.equal(limit,3);
    assert.equal(cursor,null);
    return [
      {id:'00000000-0000-4000-8000-000000000010',slug:'a',published_at:new Date('2026-01-03T00:00:00Z')},
      {id:'00000000-0000-4000-8000-000000000011',slug:'b',published_at:new Date('2026-01-02T00:00:00Z')},
      {id:'00000000-0000-4000-8000-000000000012',slug:'c',published_at:new Date('2026-01-01T00:00:00Z')},
    ];
  }};
  const sitemap=new ArticleSitemapService(sitemapRepo,seo);
  {const out=await sitemap.list({limit:2});assert.equal(out.items.length,2);assert.equal(out.items[0].loc,'https://eqcofe.com/articles/a');assert.equal(out.items[0].lastmod,'2026-01-03T00:00:00.000Z');assert.ok(out.next_cursor);}
  {await assert.rejects(()=>sitemap.list({limit:1001}),(e:any)=>e.code==='CONTENT_SITEMAP_LIMIT_INVALID');}
  {await assert.rejects(()=>sitemap.list({cursor:'bad'}),(e:any)=>e.code==='CONTENT_SITEMAP_CURSOR_INVALID');}
  console.log('content-discovery-a8: 6/6 PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1});
