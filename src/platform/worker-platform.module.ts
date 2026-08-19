import { Module } from '@nestjs/common';
import { PlatformCoreModule } from './platform-core.module';
import { AuthorizationPolicyModule } from './auth/authorization-policy.module';
import { QueuePlatformModule } from './queue/queue-platform.module';
import { EventsPlatformModule } from './events/events-platform.module';

@Module({ imports:[PlatformCoreModule,AuthorizationPolicyModule,QueuePlatformModule,EventsPlatformModule], exports:[PlatformCoreModule,AuthorizationPolicyModule,QueuePlatformModule,EventsPlatformModule] })
export class WorkerPlatformModule {}
