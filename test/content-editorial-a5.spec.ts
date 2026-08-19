import assert from 'node:assert/strict';import { ArticleEditorialService } from '../src/modules/content/application/article-editorial.service';
const staff='00000000-0000-4000-8000-000000000111',id='00000000-0000-4000-8000-000000000222',vid='00000000-0000-4000-8000-000000000333';
const vr=(o:any={})=>({id:vid,article_id:id,version_number:1,title_fa:'عنوان',slug:'coffee-guide',body:'متن',seo_title:null,meta_description:null,restored_from_version:null,created_by:staff,created_at:new Date(),...o});
const ar=(o:any={})=>({id,slug:'coffee-guide',status:'draft',current_version_id:vid,published_version_id:null,scheduled_at:null,published_at:null,first_published_at:null,archived_at:null,archive_reason:null,created_by:staff,updated_by:staff,approved_by:null,approved_at:null,published_by:null,archived_by:null,created_at:new Date(),updated_at:new Date(),version:1,...o});
function mk(status='draft'){let row:any=ar({status});const calls:any={hist:0,audit:0,outbox:0};const repo:any={byId:async()=>row,currentVersion:async()=>vr(),bySlug:async()=>row,transition:async(_e:any,x:any)=>{row=ar({...row,status:x.to,version:Number(row.version)+1,scheduled_at:x.scheduledAt??null,published_version_id:x.publish?vid:row.published_version_id,slug:x.publish?'coffee-guide':row.slug,published_at:x.publish?new Date():row.published_at,archived_at:x.archive?new Date():null,archive_reason:x.archive?x.reason:null});return row;},addTransition:async()=>{calls.hist++},versionByNumber:async()=>vr(),nextVersionNumber:async()=>2,createVersion:async(_e:any,x:any)=>vr({id:x.id,version_number:x.versionNumber,restored_from_version:x.restoredFromVersion}),setCurrentVersion:async(_e:any,x:any)=>{row=ar({...row,current_version_id:x.versionId,slug:x.canonicalSlug,version:Number(row.version)+1});return row;}};const tx:any={run:(f:any)=>f({})},ctx:any={get:()=>({actor:{type:'staff',id:staff}}),require:()=>({requestId:'r',traceId:'t',actor:{type:'staff',id:staff}})},audit:any={writeWith:async()=>calls.audit++},outbox:any={append:async()=>calls.outbox++};return {s:new ArticleEditorialService(tx,repo,ctx,audit,outbox),calls,get:()=>row};}
async function main(){
 {const x=mk();await x.s.submitReview(id);assert.equal(x.get().status,'in_review');assert.equal(x.calls.hist,1);}
 {const x=mk('in_review');await x.s.approve(id);assert.equal(x.get().status,'approved');}
 {const x=mk('approved');await x.s.schedule(id,new Date(Date.now()+60000).toISOString());assert.equal(x.get().status,'scheduled');}
 {const x=mk('approved');await x.s.publish(id);assert.equal(x.get().status,'published');assert.equal(x.get().published_version_id,vid);}
 {const x=mk('published');await x.s.unpublish(id);assert.equal(x.get().status,'unpublished');}
 {const x=mk('draft');await x.s.archive(id,'آرشیو تست');assert.equal(x.get().status,'archived');}
 {const x=mk('draft');const r:any=await x.s.restoreVersion(id,1);assert.equal(r.version.restored_from_version,1);assert.equal(r.version.version_number,2);}
 {const x=mk('approved');await assert.rejects(()=>x.s.restoreVersion(id,1),(e:any)=>e.code==='CONTENT_RESTORE_LOCKED');}
 console.log('content-editorial-a5: 8/8 PASS');
}main().catch(e=>{console.error(e);process.exitCode=1});
