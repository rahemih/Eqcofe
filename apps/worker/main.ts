import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './app.module';
import { StructuredLogger } from '../../src/platform/observability/structured-logger';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, { bufferLogs:true });
  app.useLogger(app.get(StructuredLogger)); app.enableShutdownHooks();
}
void bootstrap();
