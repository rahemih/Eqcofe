import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../../platform/auth/auth.decorators';
import { ArticleSitemapService } from '../application/article-sitemap.service';

@Controller('content')
export class ContentDiscoveryController {
  constructor(private readonly sitemap: ArticleSitemapService) {}

  @Public() @Get('sitemap/articles')
  listArticleSitemap(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.sitemap.list({ cursor, limit: limit === undefined ? undefined : Number(limit) });
  }
}
