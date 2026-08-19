import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { StructuredLogger } from '../../../platform/observability/structured-logger';
import { ExecutionContext } from '../../../shared/application/execution-context';
import { contentArticleEvent } from '../domain/content.events';
import { ArticleRow, ContentRepository } from '../infrastructure/content.repository';

@Injectable()
export class ArticleOperationsService {
  constructor(private readonly tx:TransactionManager,private readonly repo:ContentRepository,private readonly audit:AuditWriter,private readonly outbox:OutboxWriter,private readonly logger:StructuredLogger){}
  private ver(a:ArticleRow){const n=Number(a.version);if(!Number.isSafeInteger(n)||n<1)throw new Error('CONTENT_VERSION_INVALID');return n;}
  private systemContext():ExecutionContext{const id=randomUUID();return{requestId:`content-scheduler-${id}`,correlationId:id,actor:{type:'system'}};}
  async publishDue(limit=50){
    const ctx=this.systemContext();
    const result=await this.tx.run(async ex=>{
      const due=await this.repo.claimDueScheduled(ex,limit); const published:string[]=[]; const blocked:string[]=[];
      for(const before of due){
        if(!before.current_version_id || await this.repo.scheduledPublishConflict(before.id,before.current_version_id,ex)){
          blocked.push(before.id);
          await this.audit.writeWith(ex,{actorType:'system',action:'content.article.scheduled_publish_blocked',resourceType:'content_article',resourceId:before.id,beforeData:{status:before.status,version:this.ver(before),scheduled_at:before.scheduled_at},afterData:{reason:'CONTENT_SCHEDULED_PUBLISH_CONFLICT_OR_VERSION_MISSING'},requestId:ctx.requestId,traceId:ctx.traceId});
          continue;
        }
        const current=await this.repo.currentVersion(before,ex); if(!current){blocked.push(before.id);continue;}
        const row=await this.repo.publishScheduledDue(ex,{articleId:before.id,expectedAggregateVersion:this.ver(before)}); if(!row)continue;
        await this.repo.addTransition(ex,{id:randomUUID(),articleId:before.id,fromStatus:'scheduled',toStatus:'published',articleVersionId:current.id,staffId:null,scheduledAt:before.scheduled_at});
        await this.audit.writeWith(ex,{actorType:'system',action:'content.article.scheduled_publish',resourceType:'content_article',resourceId:before.id,beforeData:{status:'scheduled',version:this.ver(before),scheduled_at:before.scheduled_at},afterData:{status:'published',version:this.ver(row),content_version:current.version_number},requestId:ctx.requestId,traceId:ctx.traceId});
        await this.outbox.append(ex,[contentArticleEvent('content.article.published.v1',before.id,this.ver(row),{article_id:before.id,status:'published',content_version:current.version_number,scheduled_at:before.scheduled_at?.toISOString()??null,published_by:'system'})],ctx);
        published.push(before.id);
      }
      return{claimed:due.length,published:published.length,blocked:blocked.length,published_ids:published,blocked_ids:blocked};
    });
    if(result.blocked)this.logger.warn(`content scheduled publication blocked: ${result.blocked}`);
    return result;
  }
  summary(){return this.repo.contentOperationsSummary();}
}
