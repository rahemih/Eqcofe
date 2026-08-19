import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { catchError, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { AppError } from '../../shared/errors/app-error';
import { IDEMPOTENCY_SCOPE } from '../auth/auth.decorators';
import { IdempotencyClaim,IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly service: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const declaredScope = this.reflector.getAllAndOverride<string>(IDEMPOTENCY_SCOPE, [context.getHandler(), context.getClass()]);
    if (!declaredScope) return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<{ method:string; url:string; body?:unknown; actor?:{accountId?:string}; headers?:Record<string,string|undefined> }>();
    const response = http.getResponse<{ statusCode:number }>();
    const key = request.headers?.['idempotency-key'];
    if (!key) throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'هدر Idempotency-Key الزامی است.', 400);
    if (key.length < 8 || key.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(key)) throw new AppError('IDEMPOTENCY_KEY_INVALID', 'هدر Idempotency-Key معتبر نیست.', 400);
    const principal = request.actor?.accountId ?? hashOpaque(request.headers?.['x-checkout-token']) ?? hashOpaque(request.headers?.['x-cart-token']) ?? 'anonymous';
    const scope = `${declaredScope}:${principal}`;
    const hash = this.service.hashRequest(request.method, request.url, request.body);

    return from(this.service.claim(scope, key, hash)).pipe(
      switchMap((claim:IdempotencyClaim) => {
        if (claim.replay) { response.statusCode = claim.responseCode ?? 200; return of(claim.responseBody); }
        // Fail closed on *all* handler errors. The interceptor cannot prove whether a
        // downstream use case failed before or after its business transaction committed.
        // Marking an arbitrary handler error as retryable could therefore execute a
        // stock/price/financial mutation twice. A key may only become retryable through
        // an explicit recovery path that has proven no business commit occurred.
        return next.handle().pipe(
          catchError((error:unknown) => throwError(() => error)),
          switchMap((body:unknown) => from(this.service.complete(scope, key, response.statusCode || 200, body)).pipe(
            map(() => body),
            catchError(() => throwError(() => new AppError('IDEMPOTENCY_COMPLETION_FAILED','عملیات انجام شد اما ثبت نتیجه تکرارپذیری کامل نشد؛ اجرای مجدد خودکار متوقف است.',503))),
          )),
        );
      }),
    );
  }
}
function hashOpaque(value:string|undefined):string|undefined { return value?createHash('sha256').update(value).digest('hex'):undefined; }
