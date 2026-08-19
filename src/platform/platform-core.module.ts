import { Module } from '@nestjs/common';
import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { OutboxModule } from './outbox/outbox.module';
import { ObservabilityModule } from './observability/observability.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports:[PlatformConfigModule,DatabaseModule,RedisModule,OutboxModule,ObservabilityModule,AuditModule],
  exports:[PlatformConfigModule,DatabaseModule,RedisModule,OutboxModule,ObservabilityModule,AuditModule],
})
export class PlatformCoreModule {}
