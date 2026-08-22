import { Body,Controller,Get,Param,Patch,Post,Query } from '@nestjs/common';
import { Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { ArticleDraftService } from '../application/article-draft.service';
import { ArticleEditorialService } from '../application/article-editorial.service';
import { ArticleAdminQueryService } from '../application/article-admin-query.service';
import { ArticleOperationsService } from '../application/article-operations.service';

@Controller('admin/content/articles')
@StaffOnly()
export class ContentAdminController {
  constructor(private readonly drafts:ArticleDraftService,private readonly editorial:ArticleEditorialService,private readonly querySvc:ArticleAdminQueryService,private readonly operations:ArticleOperationsService){}
  @Permissions('content.view') @Get('operations/summary') operationsSummary(){return this.operations.summary();}
  @Permissions('content.view') @Get() list(@Query()q:any){return this.querySvc.list(q);}
  @Permissions('content.edit') @RequireIdempotency('content.article.create') @Post() create(@Body()b:any){return this.drafts.create(b);}
  @Permissions('content.view') @Get(':id') get(@Param('id')id:string){return this.querySvc.get(id);}
  @Permissions('content.edit') @RequireIdempotency('content.article.edit') @Patch(':id') update(@Param('id')id:string,@Body()b:any){return this.drafts.update(id,b);}
  @Permissions('content.review') @RequireIdempotency('content.article.submit_review') @Post(':id/submit-review') submit(@Param('id')id:string,@Body()b:any){return this.editorial.submitReview(id,b?.comment);}
  @Permissions('content.review') @RequireStepUp() @RequireIdempotency('content.article.approve') @Post(':id/approve') approve(@Param('id')id:string,@Body()b:any){return this.editorial.approve(id,b?.comment);}
  @Permissions('content.publish') @RequireStepUp() @RequireIdempotency('content.article.schedule') @Post(':id/schedule') schedule(@Param('id')id:string,@Body()b:any){return this.editorial.schedule(id,b?.scheduled_at);}
  @Permissions('content.publish') @RequireStepUp() @RequireIdempotency('content.article.publish') @Post(':id/publish') publish(@Param('id')id:string){return this.editorial.publish(id);}
  @Permissions('content.publish') @RequireStepUp() @RequireIdempotency('content.article.unpublish') @Post(':id/unpublish') unpublish(@Param('id')id:string){return this.editorial.unpublish(id);}
  @Permissions('content.archive_restore') @RequireStepUp() @RequireIdempotency('content.article.archive') @Post(':id/archive') archive(@Param('id')id:string,@Body()b:any){return this.editorial.archive(id,b?.reason);}
  @Permissions('content.view') @Get(':id/versions') versions(@Param('id')id:string){return this.querySvc.versions(id);}
  @Permissions('content.view') @Get(':id/versions/:version') version(@Param('id')id:string,@Param('version')v:string){return this.querySvc.version(id,v);}
  @Permissions('content.archive_restore') @RequireStepUp() @RequireIdempotency('content.article.version.restore') @Post(':id/versions/:version/restore') restore(@Param('id')id:string,@Param('version')v:string,@Body()b:any){return this.editorial.restoreVersion(id,Number(v),b?.reason);}
}
