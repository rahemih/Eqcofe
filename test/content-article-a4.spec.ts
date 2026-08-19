import assert from 'node:assert/strict';
import { ArticleDraftService } from '../src/modules/content/application/article-draft.service';

const staff='00000000-0000-4000-8000-000000000111';
const articleId='00000000-0000-4000-8000-000000000222';
const versionId='00000000-0000-4000-8000-000000000333';
function row(over:any={}){return {id:articleId,slug:'coffee-guide',status:'draft',current_version_id:versionId,published_version_id:null,scheduled_at:null,published_at:null,first_published_at:null,archived_at:null,archive_reason:null,created_by:staff,updated_by:staff,approved_by:null,approved_at:null,published_by:null,archived_by:null,created_at:new Date(),updated_at:new Date(),version:1,...over};}
function ver(over:any={}){return {id:versionId,article_id:articleId,version_number:1,title_fa:'راهنمای قهوه',slug:'coffee-guide',body:'متن',seo_title:null,meta_description:null,restored_from_version:null,created_by:staff,created_at:new Date(),...over};}
function make(overRepo:any={}){
 const calls:any={audit:0,outbox:0,createVersion:0,setCurrent:0};
 const repo:any={
  bySlug:async()=>null,byId:async()=>row(),currentVersion:async()=>ver(),listVersions:async()=>[ver()],versionByNumber:async()=>ver(),nextVersionNumber:async()=>2,
  createArticle:async(_ex:any,input:any)=>({article:row({id:input.id,slug:input.slug,current_version_id:input.versionId}),version:ver({id:input.versionId,article_id:input.id,title_fa:input.titleFa,slug:input.slug,body:input.body,seo_title:input.seoTitle,meta_description:input.metaDescription})}),
  createVersion:async(_ex:any,input:any)=>{calls.createVersion++;return ver({id:input.id,version_number:input.versionNumber,title_fa:input.titleFa,slug:input.slug,body:input.body,seo_title:input.seoTitle,meta_description:input.metaDescription});},
  setCurrentVersion:async(_ex:any,input:any)=>{calls.setCurrent++;return row({slug:input.canonicalSlug,current_version_id:input.versionId,version:2});},...overRepo,
 };
 const tx:any={run:async(fn:any)=>fn({})};
 const ctx:any={get:()=>({actor:{type:'staff',id:staff}}),require:()=>({actor:{type:'staff',id:staff},requestId:'r',traceId:'t',correlationId:'c'})};
 const audit:any={writeWith:async()=>{calls.audit++;}};const outbox:any={append:async()=>{calls.outbox++;}};
 return {service:new ArticleDraftService(tx,repo,ctx,audit,outbox),repo,calls};
}

async function main(){
{
 const {service,calls}=make();const created:any=await service.create({title_fa:'  راهنمای   قهوه  ',slug:'Coffee_Guide',body:'متن'});
 assert.equal(created.status,'draft');assert.equal(created.slug,'coffee-guide');assert.equal(calls.audit,1);assert.equal(calls.outbox,1);
}
{
 const {service}=make();const created:any=await service.create({title_fa:'مقاله'});assert.match(created.slug,/^article-[a-f0-9]{12}$/);
}
{
 const {service,calls}=make();const updated:any=await service.update(articleId,{title_fa:'نسخه دوم'});assert.equal(updated.content_version,2);assert.equal(calls.createVersion,1);assert.equal(calls.setCurrent,1);
}
{
 const {service,calls}=make({byId:async()=>row({status:'published',published_version_id:versionId,published_at:new Date()}),currentVersion:async()=>ver()});
 const updated:any=await service.update(articleId,{slug:'future-guide'});assert.equal(updated.slug,'coffee-guide');assert.equal(updated.content_version,2);assert.equal(calls.setCurrent,1);
}
{
 const {service}=make({byId:async()=>row({status:'approved',approved_at:new Date()})});await assert.rejects(()=>service.update(articleId,{title_fa:'x'}),(e:any)=>e.code==='CONTENT_ARTICLE_EDIT_LOCKED');
}
{
 const {service,calls}=make();const same:any=await service.update(articleId,{title_fa:'راهنمای قهوه'});assert.equal(same.content_version,1);assert.equal(calls.createVersion,0);assert.equal(calls.setCurrent,0);
}
console.log('content-article-a4: 6/6 PASS');

}
main().catch(e=>{console.error(e);process.exitCode=1;});
