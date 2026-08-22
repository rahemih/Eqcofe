import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor, TransactionManager } from '../../../platform/database/transaction-manager';

export type ArticleStatus = 'draft'|'in_review'|'approved'|'scheduled'|'published'|'unpublished'|'archived';

export interface ArticleRow {
  id:string; slug:string; status:ArticleStatus; current_version_id:string|null; published_version_id:string|null;
  scheduled_at:Date|null; published_at:Date|null; first_published_at:Date|null; archived_at:Date|null; archive_reason:string|null;
  created_by:string|null; updated_by:string|null; approved_by:string|null; approved_at:Date|null; published_by:string|null; archived_by:string|null;
  created_at:Date; updated_at:Date; version:string|number|bigint;
}

export interface ArticleVersionRow {
  id:string; article_id:string; version_number:number; title_fa:string; slug:string; body:string|null; seo_title:string|null; meta_description:string|null;
  restored_from_version:number|null; created_by:string|null; created_at:Date;
}


export interface PublicArticleSummaryRow { id:string; slug:string; title_fa:string; seo_title:string|null; meta_description:string|null; published_at:Date; }
export interface PublicArticleDetailRow extends PublicArticleSummaryRow { body:string|null; version_number:number; }
export interface SitemapArticleRow { id:string; slug:string; published_at:Date; }

export interface CreateArticleVersionInput {
  id:string; articleId:string; versionNumber:number; titleFa:string; slug:string; body:string|null; seoTitle:string|null; metaDescription:string|null;
  restoredFromVersion?:number|null; createdBy:string|null;
}

@Injectable()
export class ContentRepository {
  constructor(private readonly tx:TransactionManager){}
  db(){ return this.tx.readonly(); }

  async byId(id:string, ex:DatabaseExecutor=this.db(), lock=false):Promise<ArticleRow|null>{
    const q=lock
      ? sql<ArticleRow>`SELECT * FROM content.articles WHERE id=${id}::uuid FOR UPDATE`
      : sql<ArticleRow>`SELECT * FROM content.articles WHERE id=${id}::uuid`;
    const r=await q.execute(ex); return r.rows[0]??null;
  }

  async bySlug(slug:string, ex:DatabaseExecutor=this.db()):Promise<ArticleRow|null>{
    const r=await sql<ArticleRow>`SELECT * FROM content.articles WHERE slug=${slug} LIMIT 1`.execute(ex);
    return r.rows[0]??null;
  }

  async versionById(id:string, ex:DatabaseExecutor=this.db()):Promise<ArticleVersionRow|null>{
    const r=await sql<ArticleVersionRow>`SELECT * FROM content.article_versions WHERE id=${id}::uuid LIMIT 1`.execute(ex);
    return r.rows[0]??null;
  }

  async versionByNumber(articleId:string, versionNumber:number, ex:DatabaseExecutor=this.db()):Promise<ArticleVersionRow|null>{
    const r=await sql<ArticleVersionRow>`SELECT * FROM content.article_versions WHERE article_id=${articleId}::uuid AND version_number=${versionNumber} LIMIT 1`.execute(ex);
    return r.rows[0]??null;
  }

  async currentVersion(article:ArticleRow, ex:DatabaseExecutor=this.db()):Promise<ArticleVersionRow|null>{
    if(!article.current_version_id)return null;
    return this.versionById(article.current_version_id,ex);
  }

  async listAdminArticles(input:{limit:number;status:string|null;search:string|null},ex:DatabaseExecutor=this.db()):Promise<any[]>{
    const status=input.status;
    const search=input.search;
    const r=await sql<any>`SELECT a.id,a.slug,a.status,a.scheduled_at,a.published_at,a.created_at,a.updated_at,a.version,
      v.version_number AS content_version,v.title_fa,v.seo_title,v.meta_description
      FROM content.articles a JOIN content.article_versions v ON v.id=a.current_version_id
      WHERE (${status}::text IS NULL OR a.status=${status})
        AND (${search}::text IS NULL OR v.title_fa ILIKE '%'||${search}||'%' OR a.slug ILIKE '%'||${search}||'%')
      ORDER BY a.updated_at DESC,a.id DESC LIMIT ${input.limit}`.execute(ex);
    return r.rows;
  }

  async listVersions(articleId:string, ex:DatabaseExecutor=this.db()):Promise<ArticleVersionRow[]>{
    const r=await sql<ArticleVersionRow>`SELECT * FROM content.article_versions WHERE article_id=${articleId}::uuid ORDER BY version_number DESC,id`.execute(ex);
    return r.rows;
  }

  async createArticle(
    ex:DatabaseExecutor,
    input:{id:string;slug:string;versionId:string;staffId:string|null;titleFa:string;body:string|null;seoTitle:string|null;metaDescription:string|null},
  ):Promise<{article:ArticleRow;version:ArticleVersionRow}>{
    const ar=await sql<ArticleRow>`INSERT INTO content.articles(id,slug,status,current_version_id,created_by,updated_by,version)
      VALUES(${input.id}::uuid,${input.slug},'draft',${input.versionId}::uuid,${input.staffId}::uuid,${input.staffId}::uuid,1)
      RETURNING *`.execute(ex);
    const vr=await sql<ArticleVersionRow>`INSERT INTO content.article_versions(id,article_id,version_number,title_fa,slug,body,seo_title,meta_description,created_by)
      VALUES(${input.versionId}::uuid,${input.id}::uuid,1,${input.titleFa},${input.slug},${input.body},${input.seoTitle},${input.metaDescription},${input.staffId}::uuid)
      RETURNING *`.execute(ex);
    return {article:ar.rows[0]!,version:vr.rows[0]!};
  }

  async nextVersionNumber(articleId:string, ex:DatabaseExecutor):Promise<number>{
    const r=await sql<{next_version:number|string|bigint}>`SELECT COALESCE(MAX(version_number),0)+1 AS next_version FROM content.article_versions WHERE article_id=${articleId}::uuid`.execute(ex);
    return Number(r.rows[0]?.next_version??1);
  }

  async createVersion(ex:DatabaseExecutor,input:CreateArticleVersionInput):Promise<ArticleVersionRow>{
    const r=await sql<ArticleVersionRow>`INSERT INTO content.article_versions(id,article_id,version_number,title_fa,slug,body,seo_title,meta_description,restored_from_version,created_by)
      VALUES(${input.id}::uuid,${input.articleId}::uuid,${input.versionNumber},${input.titleFa},${input.slug},${input.body},${input.seoTitle},${input.metaDescription},${input.restoredFromVersion??null},${input.createdBy}::uuid)
      RETURNING *`.execute(ex);
    return r.rows[0]!;
  }

  async setCurrentVersion(
    ex:DatabaseExecutor,
    input:{articleId:string;expectedAggregateVersion:number;versionId:string;canonicalSlug:string;staffId:string|null},
  ):Promise<ArticleRow|null>{
    const r=await sql<ArticleRow>`UPDATE content.articles
      SET current_version_id=${input.versionId}::uuid,slug=${input.canonicalSlug},updated_by=${input.staffId}::uuid,version=version+1
      WHERE id=${input.articleId}::uuid AND version=${input.expectedAggregateVersion}
      RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async transition(ex:DatabaseExecutor,input:{articleId:string;expectedAggregateVersion:number;from:ArticleStatus[];to:ArticleStatus;staffId:string;scheduledAt?:Date|null;reason?:string|null;publish?:boolean;archive?:boolean}):Promise<ArticleRow|null>{
    const fromList=sql.join(input.from.map(v=>sql`${v}`));
    const r=await sql<ArticleRow>`UPDATE content.articles SET
      status=${input.to},
      scheduled_at=${input.to==='scheduled'?input.scheduledAt??null:null},
      approved_by=CASE WHEN ${input.to} IN ('approved','scheduled','published') THEN COALESCE(approved_by,${input.staffId}::uuid) ELSE approved_by END,
      approved_at=CASE WHEN ${input.to} IN ('approved','scheduled','published') THEN COALESCE(approved_at,now()) ELSE approved_at END,
      published_version_id=CASE WHEN ${input.publish??false} THEN current_version_id ELSE published_version_id END,
      slug=CASE WHEN ${input.publish??false} THEN (SELECT slug FROM content.article_versions WHERE id=current_version_id) ELSE slug END,
      published_at=CASE WHEN ${input.publish??false} THEN now() ELSE published_at END,
      first_published_at=CASE WHEN ${input.publish??false} THEN COALESCE(first_published_at,now()) ELSE first_published_at END,
      published_by=CASE WHEN ${input.publish??false} THEN ${input.staffId}::uuid ELSE published_by END,
      archived_at=CASE WHEN ${input.archive??false} THEN now() ELSE NULL END,
      archive_reason=CASE WHEN ${input.archive??false} THEN ${input.reason??null} ELSE NULL END,
      archived_by=CASE WHEN ${input.archive??false} THEN ${input.staffId}::uuid ELSE NULL END,
      updated_by=${input.staffId}::uuid, version=version+1
      WHERE id=${input.articleId}::uuid AND version=${input.expectedAggregateVersion} AND status IN (${fromList}) RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async addTransition(ex:DatabaseExecutor,input:{id:string;articleId:string;fromStatus:ArticleStatus|null;toStatus:ArticleStatus;articleVersionId:string|null;staffId:string|null;reason?:string|null;scheduledAt?:Date|null}){
    await sql`INSERT INTO content.article_transition_history(id,article_id,from_status,to_status,article_version_id,actor_staff_id,reason,scheduled_at)
      VALUES(${input.id}::uuid,${input.articleId}::uuid,${input.fromStatus},${input.toStatus},${input.articleVersionId}::uuid,${input.staffId}::uuid,${input.reason??null},${input.scheduledAt??null})`.execute(ex);
  }

  async listPublicArticles(input:{limit:number;cursor:{publishedAt:Date;id:string}|null},ex:DatabaseExecutor=this.db()):Promise<PublicArticleSummaryRow[]>{
    const c=input.cursor;
    const q=c
      ? sql<PublicArticleSummaryRow>`SELECT a.id,a.slug,v.title_fa,v.seo_title,v.meta_description,a.published_at FROM content.articles a JOIN content.article_versions v ON v.id=a.published_version_id WHERE a.status='published' AND (a.published_at,a.id)<(${c.publishedAt},${c.id}::uuid) ORDER BY a.published_at DESC,a.id DESC LIMIT ${input.limit}`
      : sql<PublicArticleSummaryRow>`SELECT a.id,a.slug,v.title_fa,v.seo_title,v.meta_description,a.published_at FROM content.articles a JOIN content.article_versions v ON v.id=a.published_version_id WHERE a.status='published' ORDER BY a.published_at DESC,a.id DESC LIMIT ${input.limit}`;
    return (await q.execute(ex)).rows;
  }
  async publicArticleBySlug(slug:string,ex:DatabaseExecutor=this.db()):Promise<PublicArticleDetailRow|null>{const r=await sql<PublicArticleDetailRow>`SELECT a.id,a.slug,v.title_fa,v.seo_title,v.meta_description,a.published_at,v.body,v.version_number FROM content.articles a JOIN content.article_versions v ON v.id=a.published_version_id WHERE a.status='published' AND a.slug=${slug} LIMIT 1`.execute(ex);return r.rows[0]??null;}
  async relatedPublicArticles(articleId:string,limit:number,ex:DatabaseExecutor=this.db()):Promise<PublicArticleSummaryRow[]>{const r=await sql<PublicArticleSummaryRow>`SELECT a.id,a.slug,v.title_fa,v.seo_title,v.meta_description,a.published_at FROM content.articles a JOIN content.article_versions v ON v.id=a.published_version_id WHERE a.status='published' AND a.id<>${articleId}::uuid ORDER BY a.published_at DESC,a.id DESC LIMIT ${limit}`.execute(ex);return r.rows;}

  async claimDueScheduled(ex:DatabaseExecutor,limit:number):Promise<ArticleRow[]> {
    const r=await sql<ArticleRow>`SELECT * FROM content.articles
      WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at<=now()
      ORDER BY scheduled_at,id
      FOR UPDATE SKIP LOCKED
      LIMIT ${Math.min(Math.max(limit,1),100)}`.execute(ex);
    return r.rows;
  }

  async publishScheduledDue(ex:DatabaseExecutor,input:{articleId:string;expectedAggregateVersion:number}):Promise<ArticleRow|null>{
    const r=await sql<ArticleRow>`UPDATE content.articles SET
      status='published',scheduled_at=NULL,published_version_id=current_version_id,
      slug=(SELECT slug FROM content.article_versions WHERE id=current_version_id),
      published_at=now(),first_published_at=COALESCE(first_published_at,now()),published_by=NULL,updated_by=NULL,version=version+1
      WHERE id=${input.articleId}::uuid AND version=${input.expectedAggregateVersion}
        AND status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at<=now()
      RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async scheduledPublishConflict(articleId:string,versionId:string,ex:DatabaseExecutor):Promise<boolean>{
    const v=await this.versionById(versionId,ex); if(!v)return true;
    const owner=await this.bySlug(v.slug,ex); return !!owner && owner.id!==articleId;
  }

  async contentOperationsSummary(ex:DatabaseExecutor=this.db()):Promise<any>{
    const r=await sql<any>`SELECT
      (SELECT count(*)::int FROM content.articles WHERE status='scheduled') AS scheduled_total,
      (SELECT count(*)::int FROM content.articles WHERE status='scheduled' AND scheduled_at<=now()) AS scheduled_due,
      (SELECT count(*)::int FROM content.articles WHERE status='scheduled' AND scheduled_at>now()) AS scheduled_future,
      (SELECT count(*)::int FROM content.articles WHERE status='published') AS published_total,
      (SELECT count(*)::int FROM content.articles WHERE status='in_review') AS in_review_total,
      (SELECT EXTRACT(EPOCH FROM (now()-min(scheduled_at)))::bigint FROM content.articles WHERE status='scheduled' AND scheduled_at<=now()) AS oldest_due_seconds`.execute(ex);
    return r.rows[0]??{};
  }

  async listSitemapArticles(input:{limit:number;cursor:{publishedAt:Date;id:string}|null},ex:DatabaseExecutor=this.db()):Promise<SitemapArticleRow[]>{
    const c=input.cursor;
    const q=c
      ? sql<SitemapArticleRow>`SELECT a.id,a.slug,a.published_at FROM content.articles a WHERE a.status='published' AND a.published_version_id IS NOT NULL AND (a.published_at,a.id)<(${c.publishedAt},${c.id}::uuid) ORDER BY a.published_at DESC,a.id DESC LIMIT ${input.limit}`
      : sql<SitemapArticleRow>`SELECT a.id,a.slug,a.published_at FROM content.articles a WHERE a.status='published' AND a.published_version_id IS NOT NULL ORDER BY a.published_at DESC,a.id DESC LIMIT ${input.limit}`;
    return (await q.execute(ex)).rows;
  }

}
