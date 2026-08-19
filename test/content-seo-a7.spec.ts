import assert from 'node:assert/strict';
import { ArticleSeoService } from '../src/modules/content/application/article-seo.service';

async function main(){
  {const s=new ArticleSeoService({get:async()=> 'https://eqcofe.com'} as any);const o=await s.forPublicArticle({slug:'coffee-guide',title_fa:'راهنما',seo_title:'عنوان سئو',meta_description:'توضیح',body:'x'});assert.equal(o.canonical_url,'https://eqcofe.com/articles/coffee-guide');assert.equal(o.title,'عنوان سئو');assert.equal(o.description,'توضیح');assert.equal(o.robots,'index,follow');assert.equal(o.indexable,true);}
  {const s=new ArticleSeoService({get:async()=> 'https://shop.eqcofe.com/'} as any);const o=await s.forPublicArticle({slug:'a',title_fa:'عنوان',seo_title:null,meta_description:null,body:'<script>bad()</script><p>متن <b>مقاله</b></p>'});assert.equal(o.title,'عنوان');assert.equal(o.description,'متن مقاله');assert.equal(o.canonical_url,'https://shop.eqcofe.com/articles/a');}
  {const s=new ArticleSeoService({get:async()=> 'http://bad.example'} as any);await assert.rejects(()=>s.forPublicArticle({slug:'a',title_fa:'x',seo_title:null,meta_description:null,body:null}),(e:any)=>e.code==='CONTENT_CANONICAL_BASE_URL_INVALID');}
  {const s=new ArticleSeoService({get:async()=>{throw new Error('missing')}} as any);const o=await s.forPublicArticle({slug:'a',title_fa:'x',seo_title:null,meta_description:null,body:null});assert.equal(o.canonical_url,'https://eqcofe.com/articles/a');}
  {const s=new ArticleSeoService({get:async()=> 'https://eqcofe.com'} as any);const o=await s.forPublicArticle({slug:'a',title_fa:'  عنوان  ',seo_title:'   ',meta_description:'   ',body:'body'});assert.equal(o.title,'عنوان');assert.equal(o.description,'body');}
  {const s=new ArticleSeoService({get:async()=> 'https://eqcofe.com'} as any);for(const status of ['draft','in_review','approved','scheduled','unpublished','archived'] as const){const o=await s.forLifecycle({status,hasPublishedVersion:false,slug:'private',title_fa:'خصوصی',seo_title:null,meta_description:null,body:null});assert.equal(o.indexable,false);assert.equal(o.robots,'noindex,nofollow');assert.equal(o.canonical_url,null);}}
  {const s=new ArticleSeoService({get:async()=> 'https://eqcofe.com'} as any);const o=await s.forLifecycle({status:'published',hasPublishedVersion:true,slug:'live',title_fa:'منتشر',seo_title:null,meta_description:null,body:null});assert.equal(o.indexable,true);assert.equal(o.canonical_url,'https://eqcofe.com/articles/live');}
  {const s=new ArticleSeoService({get:async()=> 'https://eqcofe.com'} as any);await assert.rejects(()=>s.forPublicArticle({slug:'../bad',title_fa:'x',seo_title:null,meta_description:null,body:null}),(e:any)=>e.code==='CONTENT_CANONICAL_SLUG_INVALID');}
  console.log('content-seo-a7: 8/8 PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1});
