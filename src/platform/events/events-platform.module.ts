import { Global, Module } from '@nestjs/common';
import { ConsumerInboxService } from './consumer-inbox.service';
import { EventConsumerRegistry } from './event-consumer.registry';

@Global()
@Module({ providers:[ConsumerInboxService,EventConsumerRegistry], exports:[ConsumerInboxService,EventConsumerRegistry] })
export class EventsPlatformModule {}
