import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ArticleDraftService } from './application/article-draft.service';
import { ArticleEditorialService } from './application/article-editorial.service';
import { ArticlePublicQueryService } from './application/article-public-query.service';
import { ContentRepository } from './infrastructure/content.repository';
import { ContentPublicController } from './presentation/content-public.controller';
import { ArticleSeoService } from './application/article-seo.service';
import { ArticleInternalLinkService } from './application/article-internal-link.service';
import { ArticleSitemapService } from './application/article-sitemap.service';
import { ArticleAdminQueryService } from './application/article-admin-query.service';
import { ContentAdminController } from './presentation/content-admin.controller';
import { ArticleOperationsService } from './application/article-operations.service';

@Module({
  imports: [ConfigurationModule],
  controllers: [ContentPublicController, ContentAdminController],
  providers: [ContentRepository, ArticleDraftService, ArticleEditorialService, ArticleSeoService, ArticlePublicQueryService, ArticleInternalLinkService, ArticleSitemapService, ArticleAdminQueryService, ArticleOperationsService],
  exports: [ArticleDraftService, ArticleEditorialService, ArticleSeoService, ArticlePublicQueryService, ArticleInternalLinkService, ArticleSitemapService, ArticleAdminQueryService, ArticleOperationsService],
})
export class ContentModule {}
