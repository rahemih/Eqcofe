import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';

export type PhysicalSalePaymentMethod = 'cash' | 'card';

@Injectable()
export class PhysicalSalePaymentService {
  async confirmInTransaction(ex: DatabaseExecutor, input: {
    saleId: string;
    amountToman: number;
    paymentMethod: PhysicalSalePaymentMethod;
    externalReference?: string | null;
    confirmedBy: string;
  }) {
    if (!Number.isSafeInteger(input.amountToman) || input.amountToman <= 0) {
      throw new DomainError('POS_PAYMENT_AMOUNT_INVALID', 'مبلغ پرداخت فروش حضوری معتبر نیست.');
    }
    if (!['cash', 'card'].includes(input.paymentMethod)) {
      throw new DomainError('POS_PAYMENT_METHOD_INVALID', 'روش پرداخت فروش حضوری معتبر نیست.');
    }
    const externalReference = input.externalReference == null ? null : String(input.externalReference).trim();
    if (externalReference !== null && (externalReference.length < 1 || externalReference.length > 120)) {
      throw new DomainError('POS_PAYMENT_REFERENCE_INVALID', 'مرجع پرداخت فروش حضوری معتبر نیست.');
    }

    const existing = (await sql<any>`SELECT * FROM payments.physical_sale_receipts WHERE sale_id=${input.saleId}::uuid FOR UPDATE`.execute(ex)).rows[0];
    if (existing) {
      if (Number(existing.amount_toman) !== input.amountToman || String(existing.payment_method) !== input.paymentMethod || (existing.external_reference ?? null) !== externalReference) {
        throw new DomainError('POS_PAYMENT_RECEIPT_CONFLICT', 'رسید پرداخت موجود با درخواست فروش حضوری سازگار نیست.');
      }
      return existing;
    }

    const id = randomUUID();
    const row = (await sql<any>`INSERT INTO payments.physical_sale_receipts(id,sale_id,amount_toman,payment_method,external_reference,confirmed_by)
      VALUES(${id}::uuid,${input.saleId}::uuid,${input.amountToman},${input.paymentMethod},${externalReference},${input.confirmedBy}::uuid)
      RETURNING *`.execute(ex)).rows[0];
    if (!row) throw new DomainError('POS_PAYMENT_RECEIPT_CREATE_FAILED', 'ثبت رسید پرداخت فروش حضوری ناموفق بود.');
    return row;
  }
}
