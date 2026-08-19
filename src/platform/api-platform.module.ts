import { Module } from '@nestjs/common';
import { PlatformCoreModule } from './platform-core.module';
import { RequestContextModule } from './request-context/request-context.module';
import { AuthPlatformModule } from './auth/auth-platform.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { HealthModule } from './health/health.module';

@Module({
  imports:[PlatformCoreModule,RequestContextModule,AuthPlatformModule,IdempotencyModule,HealthModule],
  exports:[PlatformCoreModule,RequestContextModule,AuthPlatformModule,IdempotencyModule],
})
export class ApiPlatformModule {}
