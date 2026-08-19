import { Global, Module } from '@nestjs/common';
import { AuditWriter } from './audit.writer';

@Global()
@Module({ providers:[AuditWriter], exports:[AuditWriter] })
export class AuditModule {}
