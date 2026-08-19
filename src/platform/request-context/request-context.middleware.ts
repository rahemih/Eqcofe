import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RequestContextStore } from './request-context.store';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly store: RequestContextStore) {}

  use(req: { headers?: Record<string, string | string[] | undefined> }, res: { setHeader: (name: string, value: string) => void }, next: () => void): void {
    const incoming = req.headers?.['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
    const traceparent = req.headers?.traceparent;
    const traceId = typeof traceparent === 'string' ? traceparent : undefined;
    res.setHeader('x-request-id', requestId);
    this.store.run({ requestId, traceId, correlationId: randomUUID(), actor: { type: 'system' } }, next);
  }
}
