import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from './queue-names';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
        prefix: 'eqcofe',
      }),
    }),
    BullModule.registerQueue(
      { name: QueueNames.DomainEventsCritical },
      { name: QueueNames.Notifications },
      { name: QueueNames.SearchIndex },
      { name: QueueNames.Analytics },
      { name: QueueNames.Ai },
      { name: QueueNames.Marketing },
      { name: QueueNames.Integrations },
      { name: QueueNames.Reports },
    ),
  ],
  exports: [BullModule],
})
export class QueuePlatformModule {}
