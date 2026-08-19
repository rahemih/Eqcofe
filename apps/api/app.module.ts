import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ApiPlatformModule } from '../../src/platform/api-platform.module';
import { DomainModulesModule } from '../../src/modules/domain-modules.module';
import { RequestContextMiddleware } from '../../src/platform/request-context/request-context.middleware';

@Module({ imports: [ApiPlatformModule, DomainModulesModule], providers: [RequestContextMiddleware] })
export class ApiAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
