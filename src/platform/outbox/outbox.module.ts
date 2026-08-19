import { Global, Module } from '@nestjs/common';
import { OutboxWriter } from './outbox-writer';
import { OutboxRepository } from './outbox-repository';

@Global()
@Module({ providers: [OutboxWriter, OutboxRepository], exports: [OutboxWriter, OutboxRepository] })
export class OutboxModule {}
