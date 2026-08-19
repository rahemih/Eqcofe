import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { contentArticleEvent } from '../domain/content.events';
import { ArticleRow,ArticleVersionRow,ContentRepository } from '../infrastructure/content.repository';

export interface ArticleCreateInput { title_fa?:unknown; slug?:unknown; body?:unknown; seo_title?:unknown; meta_description?:unknown; }
export interface ArticlePatchInput { title_fa?:unknown; slug?:unknown; body?:unknown; seo_title?:unknown; meta_description?:unknown; }

@Injectable()
export class ArticleDraftService {
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:ContentRepository,
    private readonly ctx:RequestContextStore,
    private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,
  ){}

  private staffId():string{
    const actor=this.ctx.get()?.actor;
    if(actor?.type!=='staff'||!actor.id)throw new DomainError('STAFF_REQUIRED','دسترسی کارشناس محتوا الزامی است.');
    return actor.id;
  }

  private title(value:unknown):string{
    const v=String(value??'').trim().replace(/\s+/g,' ');
    if(!v||v.length>300)throw new DomainError('CONTENT_TITLE_INVALID','عنوان مقاله معتبر نیست.');
    return v;
  }

  private optionalText(value:unknown,max:number,field:string,allowNull=true):string|null{
    if(value===null&&allowNull)return null;
    const v=String(value??'').trim();
    if(!v){ if(allowNull)return null; throw new DomainError('VALIDATION_ERROR',`${field} معتبر نیست.`); }
    if(v.length>max)throw new DomainError('VALIDATION_ERROR',`${field} بیش از حد مجاز است.`);
    return v;
  }

  private seo(value:unknown,max:number,field:string):string|null{
    const v=this.optionalText(value,max,field,true);
    if(v===null)return null;
    if(/<\s*script\b|javascript\s*:|\b(api[_-]?key|secret|password|access[_-]?token|refresh[_-]?token)\b/i.test(v))
      throw new DomainError('CONTENT_SEO_UNSAFE',`${field} شامل محتوای غیرمجاز است.`);
    return v;
  }

  private slug(value:unknown,fallbackId?:string):string{
    let v=value===null||value===undefined?'':String(value).trim().toLowerCase();
    v=v.replace(/[_\s]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    if(!v&&fallbackId)v=`article-${fallbackId.replace(/-/g,'').slice(0,12)}`;
    if(!v||v.length>180||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))throw new DomainError('CONTENT_SLUG_INVALID','اسلاگ مقاله معتبر نیست.');
    return v;
  }

  private aggregateVersion(row:ArticleRow):number{
    const n=Number(row.version);
    if(!Number.isSafeInteger(n)||n<1)throw new DomainError('CONTENT_VERSION_INVALID','نسخه تجمیعی مقاله معتبر نیست.');
    return n;
  }

  private present(article:ArticleRow,version:ArticleVersionRow){
    return {id:article.id,slug:article.slug,status:article.status,title_fa:version.title_fa,body:version.body,seo_title:version.seo_title,meta_description:version.meta_description,content_version:version.version_number,version:this.aggregateVersion(article),published_version_id:article.published_version_id,scheduled_at:article.scheduled_at,published_at:article.published_at,created_at:article.created_at,updated_at:article.updated_at};
  }

  async get(id:string){
    const article=await this.repo.byId(id);
    if(!article)throw new DomainError('CONTENT_ARTICLE_NOT_FOUND','مقاله پیدا نشد.');
    const version=await this.repo.currentVersion(article);
    if(!version)throw new DomainError('CONTENT_ARTICLE_VERSION_MISSING','نسخه فعلی مقاله پیدا نشد.');
    return this.present(article,version);
  }

  async listVersions(id:string){
    const article=await this.repo.byId(id);
    if(!article)throw new DomainError('CONTENT_ARTICLE_NOT_FOUND','مقاله پیدا نشد.');
    return this.repo.listVersions(id);
  }

  async getVersion(id:string,versionNumber:number){
    if(!Number.isSafeInteger(versionNumber)||versionNumber<1)throw new DomainError('CONTENT_VERSION_INVALID','نسخه مقاله معتبر نیست.');
    const row=await this.repo.versionByNumber(id,versionNumber);
    if(!row)throw new DomainError('CONTENT_ARTICLE_VERSION_NOT_FOUND','نسخه مقاله پیدا نشد.');
    return row;
  }

  async create(input:ArticleCreateInput){
    const staffId=this.staffId(),context=this.ctx.require();
    const id=randomUUID(),versionId=randomUUID();
    const titleFa=this.title(input?.title_fa);
    const slug=this.slug(input?.slug,id);
    const body=input?.body===undefined||input?.body===null?null:this.optionalText(input.body,100000,'متن مقاله',false);
    const seoTitle=input?.seo_title===undefined?null:this.seo(input.seo_title,300,'عنوان سئو');
    const metaDescription=input?.meta_description===undefined?null:this.seo(input.meta_description,500,'توضیحات متا');
    return this.tx.run(async ex=>{
      const existing=await this.repo.bySlug(slug,ex);
      if(existing)throw new DomainError('CONTENT_SLUG_CONFLICT','این اسلاگ قبلاً استفاده شده است.');
      const created=await this.repo.createArticle(ex,{id,slug,versionId,staffId,titleFa,body,seoTitle,metaDescription});
      await this.audit.writeWith(ex,{actorType:'staff',actorId:staffId,action:'content.article.create',resourceType:'content_article',resourceId:id,afterData:{slug,status:'draft',content_version:1,version:1},requestId:context.requestId,traceId:context.traceId});
      await this.outbox.append(ex,[contentArticleEvent('content.article.created.v1',id,1,{article_id:id,slug,status:'draft',content_version:1})],context);
      return this.present(created.article,created.version);
    });
  }

  async update(id:string,input:ArticlePatchInput){
    const staffId=this.staffId(),context=this.ctx.require();
    const allowed=new Set(['title_fa','slug','body','seo_title','meta_description']);
    const keys=Object.keys(input??{});
    if(keys.length===0)throw new DomainError('CONTENT_UPDATE_EMPTY','حداقل یک فیلد مقاله باید تغییر کند.');
    if(keys.some(k=>!allowed.has(k)))throw new DomainError('CONTENT_FIELD_FORBIDDEN','تغییر این فیلد مقاله از این مسیر مجاز نیست.');
    return this.tx.run(async ex=>{
      const article=await this.repo.byId(id,ex,true);
      if(!article)throw new DomainError('CONTENT_ARTICLE_NOT_FOUND','مقاله پیدا نشد.');
      if(article.status==='archived')throw new DomainError('CONTENT_ARTICLE_ARCHIVED','مقاله آرشیوشده قابل ویرایش نیست.');
      if(article.status==='approved'||article.status==='scheduled')throw new DomainError('CONTENT_ARTICLE_EDIT_LOCKED','مقاله تأیید یا زمان‌بندی‌شده تا تعیین تکلیف چرخه انتشار قابل ویرایش نیست.');
      const current=await this.repo.currentVersion(article,ex);
      if(!current)throw new DomainError('CONTENT_ARTICLE_VERSION_MISSING','نسخه فعلی مقاله پیدا نشد.');
      const titleFa=Object.prototype.hasOwnProperty.call(input,'title_fa')?this.title(input.title_fa):current.title_fa;
      const desiredSlug=Object.prototype.hasOwnProperty.call(input,'slug')?this.slug(input.slug):current.slug;
      const body=Object.prototype.hasOwnProperty.call(input,'body')?(input.body===null?null:this.optionalText(input.body,100000,'متن مقاله',false)):current.body;
      const seoTitle=Object.prototype.hasOwnProperty.call(input,'seo_title')?this.seo(input.seo_title,300,'عنوان سئو'):current.seo_title;
      const metaDescription=Object.prototype.hasOwnProperty.call(input,'meta_description')?this.seo(input.meta_description,500,'توضیحات متا'):current.meta_description;
      const changed=titleFa!==current.title_fa||desiredSlug!==current.slug||body!==current.body||seoTitle!==current.seo_title||metaDescription!==current.meta_description;
      if(!changed)return this.present(article,current);

      if(desiredSlug!==article.slug){const owner=await this.repo.bySlug(desiredSlug,ex);if(owner&&owner.id!==article.id)throw new DomainError('CONTENT_SLUG_CONFLICT','این اسلاگ قبلاً استفاده شده است.');}
      const next=await this.repo.nextVersionNumber(article.id,ex);
      if(!Number.isSafeInteger(next)||next<2)throw new DomainError('CONTENT_VERSION_INVALID','نسخه بعدی مقاله معتبر نیست.');
      const version=await this.repo.createVersion(ex,{id:randomUUID(),articleId:article.id,versionNumber:next,titleFa,slug:desiredSlug,body,seoTitle,metaDescription,createdBy:staffId});
      // Published URL identity remains stable until a later explicit publish decision in A5.
      const canonicalSlug=article.status==='published'?article.slug:desiredSlug;
      const updated=await this.repo.setCurrentVersion(ex,{articleId:article.id,expectedAggregateVersion:this.aggregateVersion(article),versionId:version.id,canonicalSlug,staffId});
      if(!updated)throw new DomainError('VERSION_CONFLICT','مقاله همزمان تغییر کرده است؛ اطلاعات جدید را دریافت و دوباره تلاش کنید.');
      await this.audit.writeWith(ex,{actorType:'staff',actorId:staffId,action:'content.article.edit',resourceType:'content_article',resourceId:article.id,beforeData:{slug:article.slug,status:article.status,current_content_version:current.version_number,version:this.aggregateVersion(article)},afterData:{slug:updated.slug,status:updated.status,current_content_version:version.version_number,version:this.aggregateVersion(updated),pending_slug:desiredSlug!==updated.slug?desiredSlug:undefined},requestId:context.requestId,traceId:context.traceId});
      await this.outbox.append(ex,[contentArticleEvent('content.article.version_created.v1',article.id,this.aggregateVersion(updated),{article_id:article.id,content_version:version.version_number,status:updated.status,pending_slug:desiredSlug!==updated.slug?desiredSlug:null})],context);
      return this.present(updated,version);
    });
  }
}
