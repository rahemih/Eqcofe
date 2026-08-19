import assert from 'node:assert/strict';
import { ArticlePublicQueryService } from '../src/modules/content/application/article-public-query.service';

const now=new Date('2026-08-19T08:00:00.000Z');
const rows=[
 {id:'00000000-0000-4000-8000-000000000001',slug:'newest',title_fa:'جدید',seo_title:'سئو جدید',meta_description:'متا',published_at:new Date(now.getTime()),body:'بدنه جدید',version_number:3},
 {id:'00000000-0000-4000-8000-000000000002',slug:'older',title_fa:'قدیمی',seo_title:null,meta_description:null,published_at:new Date(now.getTime()-1000),body:'بدنه قدیمی',version_number:2},
 {id:'00000000-0000-4000-8000-000000000003',slug:'third',title_fa:'سوم',seo_title:null,meta_description:null,published_at:new Date(now.getTime()-2000),body:'بدنه سوم',version_number:1},
];

async function main(){
 {
  const repo:any={listPublicArticles:async({limit}:any)=>rows.slice(0,limit)};
  const svc=new ArticlePublicQueryService(repo,{forPublicArticle:async(r:any)=>({title:r.seo_title||r.title_fa,description:r.meta_description,canonical_url:'https://eqcofe.com/articles/'+r.slug,indexable:true,robots:'index,follow'})} as any);
  const out:any=await svc.list({limit:2});
  assert.equal(out.items.length,2);assert.equal(out.items[0].slug,'newest');assert.ok(out.next_cursor);
  const decoded=Buffer.from(out.next_cursor,'base64url').toString('utf8');assert.ok(decoded.includes(rows[1].id));
 }
 {
  const calls:any[]=[];const repo:any={listPublicArticles:async(x:any)=>{calls.push(x);return[];}};
  const svc=new ArticlePublicQueryService(repo,{forPublicArticle:async(r:any)=>({title:r.seo_title||r.title_fa,description:r.meta_description,canonical_url:'https://eqcofe.com/articles/'+r.slug,indexable:true,robots:'index,follow'})} as any);
  const cursor=Buffer.from(`${rows[1].published_at.toISOString()}|${rows[1].id}`,'utf8').toString('base64url');
  await svc.list({cursor,limit:10});assert.equal(calls[0].cursor.id,rows[1].id);
 }
 {
  const repo:any={publicArticleBySlug:async(slug:string)=>slug==='newest'?rows[0]:null};
  const svc=new ArticlePublicQueryService(repo,{forPublicArticle:async(r:any)=>({title:r.seo_title||r.title_fa,description:r.meta_description,canonical_url:'https://eqcofe.com/articles/'+r.slug,indexable:true,robots:'index,follow'})} as any);const out:any=await svc.getBySlug('NEWEST');
  assert.equal(out.slug,'newest');assert.equal(out.body,'بدنه جدید');assert.equal(out.content_version,3);
 }
 {
  const repo:any={publicArticleBySlug:async()=>null};const svc=new ArticlePublicQueryService(repo,{forPublicArticle:async(r:any)=>({title:r.seo_title||r.title_fa,description:r.meta_description,canonical_url:'https://eqcofe.com/articles/'+r.slug,indexable:true,robots:'index,follow'})} as any);
  await assert.rejects(()=>svc.getBySlug('draft-hidden'),(e:any)=>e.code==='CONTENT_ARTICLE_NOT_FOUND');
 }
 {
  const repo:any={publicArticleBySlug:async()=>rows[0],relatedPublicArticles:async(id:string,limit:number)=>{assert.equal(id,rows[0].id);assert.equal(limit,2);return rows.slice(1,3);}};
  const svc=new ArticlePublicQueryService(repo,{forPublicArticle:async(r:any)=>({title:r.seo_title||r.title_fa,description:r.meta_description,canonical_url:'https://eqcofe.com/articles/'+r.slug,indexable:true,robots:'index,follow'})} as any);const out:any=await svc.related('newest',2);assert.deepEqual(out.items.map((x:any)=>x.slug),['older','third']);
 }
 {
  const svc=new ArticlePublicQueryService({listPublicArticles:async()=>[]} as any,{forPublicArticle:async()=>({})} as any);
  await assert.rejects(()=>svc.list({cursor:'%%%'}),(e:any)=>e.code==='CONTENT_PUBLIC_CURSOR_INVALID');
  await assert.rejects(()=>svc.list({limit:101}),(e:any)=>e.code==='CONTENT_PUBLIC_LIMIT_INVALID');
 }
 console.log('content-public-a6: 6/6 PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1});
