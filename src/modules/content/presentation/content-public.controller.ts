import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../../platform/auth/auth.decorators';
import { ArticlePublicQueryService } from '../application/article-public-query.service';

@Controller('articles')
export class ContentPublicController {
  constructor(private readonly publicArticles: ArticlePublicQueryService) {}

  @Public() @Get()
  list(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.publicArticles.list({ cursor, limit: limit === undefined ? undefined : Number(limit) });
  }

  @Public() @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.publicArticles.getBySlug(slug);
  }

  @Public() @Get(':slug/related')
  related(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.publicArticles.related(slug, limit === undefined ? undefined : Number(limit));
  }
}
