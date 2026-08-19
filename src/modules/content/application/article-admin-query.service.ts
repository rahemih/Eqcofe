import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { ArticleStatus,ContentRepository } from '../infrastructure/content.repository';

const STATUSES=new Set<ArticleStatus>(['draft','in_review','approved','scheduled','published','unpublished','archived']);
@Injectable()
export class ArticleAdminQueryService {
  constructor(private readonly repo:ContentRepository){}
  private limit(v:unknown){const n=Number(v??50);return Number.isSafeInteger(n)&&n>=1&&n<=200?n:50;}
  async list(q:any={}){const raw=q.status?String(q.status):null;if(raw&&!STATUSES.has(raw as ArticleStatus))throw new DomainError('CONTENT_STATUS_INVALID','وضعیت مقاله معتبر نیست.');const search=q.search?String(q.search).trim():null;if(search&&search.length>200)throw new DomainError('VALIDATION_ERROR','عبارت جستجو بیش از حد مجاز است.');return this.repo.listAdminArticles({limit:this.limit(q.limit),status:raw,search:search||null});}
  async get(id:string){const a=await this.repo.byId(id);if(!a)throw new DomainError('CONTENT_ARTICLE_NOT_FOUND','مقاله پیدا نشد.');const v=await this.repo.currentVersion(a);if(!v)throw new DomainError('CONTENT_ARTICLE_VERSION_MISSING','نسخه فعلی مقاله پیدا نشد.');return {article:a,version:v};}
  async versions(id:string){const a=await this.repo.byId(id);if(!a)throw new DomainError('CONTENT_ARTICLE_NOT_FOUND','مقاله پیدا نشد.');return this.repo.listVersions(id);}
  async version(id:string,raw:string){const n=Number(raw);if(!Number.isSafeInteger(n)||n<1)throw new DomainError('CONTENT_VERSION_INVALID','نسخه مقاله معتبر نیست.');const v=await this.repo.versionByNumber(id,n);if(!v)throw new DomainError('CONTENT_ARTICLE_VERSION_NOT_FOUND','نسخه مقاله پیدا نشد.');return v;}
}
