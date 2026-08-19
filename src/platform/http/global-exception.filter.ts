import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { AppError } from '../../shared/errors/app-error';
import { DomainError } from '../../shared/errors/domain-error';
import { RequestContextStore } from '../request-context/request-context.store';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly contextStore: RequestContextStore) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { send: (body: unknown) => void } }>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'خطای داخلی سرور رخ داده است.';
    let details: Record<string, unknown> = {};
    let fieldErrors: readonly unknown[] = [];

    if (exception instanceof AppError) {
      status = exception.httpStatus; code = exception.code; message = exception.message;
      details = exception.details; fieldErrors = exception.fieldErrors;
    } else if (exception instanceof DomainError) {
      code = exception.code; message = exception.message; details = exception.details;
      status = domainStatus(exception.code);
    } else if (exception instanceof HttpException) {
      const httpException=exception as any;
      status = httpException.getStatus();
      const responseBody = httpException.getResponse();
      const rawMessage = typeof responseBody === 'string' ? responseBody : (typeof responseBody === 'object' && responseBody && 'message' in responseBody ? (responseBody as any).message : httpException.message);
      const candidate = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
      code = typeof candidate === 'string' && /^[A-Z][A-Z0-9_]+$/.test(candidate) ? candidate : `HTTP_${status}`;
      message = status >= 500 ? message : (typeof candidate === 'string' ? candidate : httpException.message);
      } else if (typeof exception === 'object' && exception && 'code' in exception) {
      const pgCode=String((exception as any).code);
      if(pgCode==='23505'){status=409;code='UNIQUE_CONSTRAINT_VIOLATION';message='رکورد تکراری است.';}
      else if(pgCode==='23503'){status=422;code='REFERENCE_NOT_FOUND';message='مرجع انتخاب‌شده معتبر نیست.';}
      else if(pgCode==='23514'||pgCode==='23502'){status=422;code='DATA_CONSTRAINT_VIOLATION';message='داده ارسالی با قواعد سیستم سازگار نیست.';}
      else if(pgCode==='22P02'){status=400;code='VALIDATION_ERROR';message='شناسه یا نوع داده ارسالی معتبر نیست.';}
      else if(pgCode==='23P01'){status=409;code='CONSTRAINT_CONFLICT';message='این تغییر با یک بازه یا قانون فعال دیگر تداخل دارد.';}
      else if(pgCode==='40001'||pgCode==='40P01'){status=409;code='CONCURRENT_UPDATE_RETRY_REQUIRED';message='به دلیل تغییر همزمان، درخواست باید با کلید تکرارپذیری جدید و پس از بازیابی وضعیت تکرار شود.';}
    }

    response.status(status).send({
      success: false,
      error: { code, message, details, field_errors: fieldErrors },
      meta: { request_id: this.contextStore.get()?.requestId },
    });
  }
}

function domainStatus(code: string): number {
  if (['CART_ACCESS_DENIED','CHECKOUT_ACCESS_REQUIRED','CHECKOUT_INVALID','CUSTOMER_REQUIRED','PAYMENT_CALLBACK_STATE_INVALID','PAYMENT_CALLBACK_STATE_REQUIRED'].includes(code)) return 401;
  if (['PAYMENTS_DISABLED','PAYMENT_PROVIDER_UNAVAILABLE','PAYMENT_CALLBACK_NOT_CONFIGURED','REFUND_RECONCILIATION_UNSUPPORTED'].includes(code)) return 503;
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (code === 'INVALID_STATE_TRANSITION' || code.includes('CONFLICT') || [
    'CART_ALREADY_IN_CHECKOUT','CART_CHANGED_SINCE_QUOTE','ORDER_ALREADY_CREATED',
    'RESERVATION_NOT_ATTACHABLE','RESERVATION_RELEASE_CONFLICT','RESERVATION_NOT_CONVERTIBLE',
    'LATE_PAYMENT_STOCK_UNAVAILABLE','VERSION_CONFLICT','PAYMENT_PROVIDER_CHECK_IN_PROGRESS','PAYMENT_PROVIDER_REFERENCE_CONFLICT','REFUND_PROVIDER_REFERENCE_CONFLICT','REFUND_SEPARATION_OF_DUTIES'
  ].includes(code)) return 409;
  return 422;
}
