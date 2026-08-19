import { Global, Module } from '@nestjs/common';
import { StructuredLogger } from './structured-logger';
@Global()
@Module({ providers:[StructuredLogger], exports:[StructuredLogger] })
export class ObservabilityModule {}
