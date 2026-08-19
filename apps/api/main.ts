import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import helmet from '@fastify/helmet';
import { RequestMethod } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { parse } from 'yaml';
import { ApiAppModule } from './app.module';
import { RequestContextStore } from '../../src/platform/request-context/request-context.store';
import { ResponseEnvelopeInterceptor } from '../../src/platform/http/response-envelope.interceptor';
import { GlobalExceptionFilter } from '../../src/platform/http/global-exception.filter';
import { IdempotencyInterceptor } from '../../src/platform/idempotency/idempotency.interceptor';
import { IdempotencyService } from '../../src/platform/idempotency/idempotency.service';
import { StructuredLogger } from '../../src/platform/observability/structured-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(ApiAppModule, new FastifyAdapter({ logger:false }), { bufferLogs:true, rawBody:true });
  app.enableShutdownHooks();
  app.useLogger(app.get(StructuredLogger));
  await app.register(helmet, { global:true });
  app.setGlobalPrefix('api/v1', { exclude:[
    { path:'health/live', method:RequestMethod.GET },
    { path:'health/ready', method:RequestMethod.GET },
  ]});

  const config = app.get(ConfigService);
  const allowedOrigins=String(config.get<string>('BROWSER_ALLOWED_ORIGINS','')).split(',').map(x=>x.trim()).filter(Boolean);
  app.enableCors({ origin:allowedOrigins, credentials:true, methods:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders:['content-type','x-request-id','x-client-version','idempotency-key','if-match','x-step-up-token','x-checkout-token','x-cart-token'], exposedHeaders:['etag','x-request-id'] });
  const contextStore = app.get(RequestContextStore);
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new IdempotencyInterceptor(reflector, app.get(IdempotencyService)),
    new ResponseEnvelopeInterceptor(reflector, contextStore),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(contextStore));

  if (config.get<boolean>('OPENAPI_DOCS_ENABLED', true)) {
    const contract = parse(readFileSync(resolve(process.cwd(),'contracts/http/openapi.yaml'),'utf8')) as OpenAPIObject;
    SwaggerModule.setup('docs', app, contract);
  }
  await app.listen(config.get<number>('API_PORT',3000), '0.0.0.0');
}
void bootstrap();
