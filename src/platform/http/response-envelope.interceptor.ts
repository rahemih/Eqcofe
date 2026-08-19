import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RequestContextStore } from '../request-context/request-context.store';
import { RAW_RESPONSE } from './raw-response.decorator';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly contextStore: RequestContextStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [context.getHandler(), context.getClass()]);
    if (raw) return next.handle();

    return next.handle().pipe(
      map((value) => {
        const pagination = value && typeof value === 'object' && '__pagination' in (value as Record<string, unknown>)
          ? (value as Record<string, unknown>).__pagination
          : undefined;
        let data: unknown = value ?? null;
        if (pagination && value && typeof value === 'object') {
          const { __pagination: _hidden, ...rest } = value as Record<string, unknown>;
          data = rest;
        }
        return {
          success: true,
          data,
          meta: {
            request_id: this.contextStore.get()?.requestId,
            timestamp: new Date().toISOString(),
            ...(pagination ? { pagination } : {}),
          },
        };
      }),
    );
  }
}
