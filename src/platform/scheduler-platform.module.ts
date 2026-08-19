import { Module } from '@nestjs/common';
import { PlatformCoreModule } from './platform-core.module';
import { AuthorizationPolicyModule } from './auth/authorization-policy.module';
@Module({ imports:[PlatformCoreModule,AuthorizationPolicyModule], exports:[PlatformCoreModule,AuthorizationPolicyModule] })
export class SchedulerPlatformModule {}
