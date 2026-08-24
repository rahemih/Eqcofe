import { Injectable, OnModuleInit } from '@nestjs/common';
import { sql, Transaction } from 'kysely';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { EventConsumerRegistry } from '../../../platform/events/event-consumer.registry';
import { EventConsumer, IntegrationEvent } from '../../../platform/events/integration-event';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';
import { AnalyticsAuthoritativeSourceReader } from '../infrastructure/analytics-authoritative-source.reader';

const TYPES = [
  'order.created.v1','order.submitted.v1','order.confirmed.v1','order.cancelled.v1','order.expired.v1','order.completed.v1',
  'payment.initiated.v1','payment.failed.v1','payment.paid.v1','payment.late_received.v1','payment.partially_refunded.v1','payment.refunded.v1',
  'inventory.stock.consumed.v1','inventory.return.received.v1',
  'finance.profit.calculated.v1','finance.profit.finalized.v1','finance.profit.reversed.v1',
  'customer.wholesale_application.submitted.v1','customer.wholesale_application.review_started.v1',
  'customer.wholesale_application.approved.v1','customer.wholesale_application.rejected.v1',
  'fulfillment.allocated.v1','fulfillment.preparation_started.v1','fulfillment.picked.v1','fulfillment.unpicked.v1',
  'shipment.created.v1','shipment.ready.v1','shipment.handed_over.v1','shipment.cancelled.v1','shipment.tracking_status_changed.v1',
  'return.requested.v1','return.review_started.v1','return.approved.v1','return.rejected.v1','return.received.v1','return.inspection_started.v1','return.resolved.v1','return.cancelled.v1',
  'warranty.claim_requested.v1','warranty.review_started.v1','warranty.approved.v1','warranty.rejected.v1','warranty.received.v1','warranty.repair_started.v1','warranty.resolved.v1','warranty.closed.v1',
] as const;

@Injectable()
export class AnalyticsCrossDomainConsumer implements EventConsumer, OnModuleInit {
  readonly consumerName = 'analytics.cross_domain.v1';
  readonly eventTypes = TYPES;

  constructor(
    private readonly registry: EventConsumerRegistry,
    private readonly source: AnalyticsAuthoritativeSourceReader,
    private readonly repository: AnalyticsProjectionRepository,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async handle(event: IntegrationEvent, trx: Transaction<DatabaseSchema>): Promise<void> {
    const watermark = new Date();
    if (event.event_type.startsWith('fulfillment.')) {
      const orderId=this.payloadId(event,'order_id'); if(!orderId)return;
      const metric=await this.source.fulfillmentOperational(trx,orderId); if(!metric)return;
      await this.repository.upsertOperational(trx,'fulfillment',metric);
      await this.repository.advanceCheckpoint(trx,'fulfillment_operational_metrics',event.event_id); return;
    }
    if (event.event_type.startsWith('shipment.')) {
      const shipmentId=this.payloadId(event,'shipment_id')??event.aggregate_id;
      const metric=await this.source.shipmentOperational(trx,shipmentId); if(!metric)return;
      await this.repository.upsertOperational(trx,'shipment',metric);
      await this.repository.advanceCheckpoint(trx,'shipment_operational_metrics',event.event_id); return;
    }
    if (event.event_type.startsWith('return.')) {
      const returnId=this.payloadId(event,'return_id')??event.aggregate_id;
      const metric=await this.source.returnOperational(trx,returnId); if(!metric)return;
      await this.repository.upsertOperational(trx,'return',metric);
      await this.repository.advanceCheckpoint(trx,'return_operational_metrics',event.event_id); return;
    }
    if (event.event_type.startsWith('warranty.')) {
      const claimId=this.payloadId(event,'claim_id')??event.aggregate_id;
      const metric=await this.source.warrantyOperational(trx,claimId); if(!metric)return;
      await this.repository.upsertOperational(trx,'warranty',metric);
      await this.repository.advanceCheckpoint(trx,'warranty_operational_metrics',event.event_id); return;
    }
    if (event.event_type.startsWith('customer.wholesale_application.')) {
      const applicationId = this.resolveWholesaleApplicationId(event);
      if (!applicationId) return;
      const metric = await this.source.wholesaleApplication(trx, applicationId, watermark);
      if (!metric) return;
      await this.repository.upsertWholesaleApplication(trx, metric);
      await this.repository.advanceCheckpoint(trx, 'wholesale_application_metrics', event.event_id);
      return;
    }

    if (event.event_type.startsWith('inventory.')) {
      const variantId = await this.resolveVariantId(event, trx);
      if (!variantId) return;
      const metric = await this.source.inventorySnapshot(trx, variantId, watermark);
      await this.repository.upsertInventorySnapshot(trx, metric);
      await this.repository.advanceCheckpoint(trx, 'inventory_snapshot', event.event_id);
      return;
    }

    const orderId = await this.resolveOrderId(event, trx);
    if (!orderId) return;
    const context = await this.source.orderContext(trx, orderId);
    if (!context) return;

    if (event.event_type.startsWith('finance.profit.')) {
      const profit = await this.source.profitDaily(trx, context.businessDate, watermark);
      await this.repository.upsertProfitDaily(trx, profit);
      await this.repository.advanceCheckpoint(trx, 'profit_daily', event.event_id);
      return;
    }

    const sales = await this.source.salesDaily(trx, context.businessDate, watermark);
    await this.repository.upsertSalesDaily(trx, sales);
    await this.repository.advanceCheckpoint(trx, 'sales_daily', event.event_id);

    if (context.customerId) {
      const customer = await this.source.customerMetric(trx, context.customerId, watermark);
      await this.repository.upsertCustomerMetric(trx, customer);
      await this.repository.advanceCheckpoint(trx, 'customer_metrics', event.event_id);
    }
  }

  private payloadId(event:IntegrationEvent,key:string):string|null{const p=(event.payload??{}) as Record<string,unknown>;return typeof p[key]==='string'?String(p[key]):null;}

  private async resolveOrderId(event: IntegrationEvent, trx: Transaction<DatabaseSchema>): Promise<string | null> {
    const p = (event.payload ?? {}) as Record<string, unknown>;
    if (typeof p.order_id === 'string') return p.order_id;
    if (event.event_type.startsWith('order.')) return event.aggregate_id;
    if (event.event_type.startsWith('payment.')) {
      const r = await sql<any>`SELECT order_id FROM payments.payments WHERE id=${event.aggregate_id}::uuid`.execute(trx);
      return r.rows[0]?.order_id ? String(r.rows[0].order_id) : null;
    }
    if (event.event_type.startsWith('finance.profit.')) {
      const r = await sql<any>`SELECT order_id FROM finance.profit_calculations WHERE id=${event.aggregate_id}::uuid`.execute(trx);
      return r.rows[0]?.order_id ? String(r.rows[0].order_id) : null;
    }
    return null;
  }

  private resolveWholesaleApplicationId(event: IntegrationEvent): string | null {
    const p = (event.payload ?? {}) as Record<string, unknown>;
    if (typeof p.application_id === 'string') return p.application_id;
    return event.aggregate_type === 'customer_wholesale_application' ? event.aggregate_id : null;
  }

  private async resolveVariantId(event: IntegrationEvent, trx: Transaction<DatabaseSchema>): Promise<string | null> {
    const p = (event.payload ?? {}) as Record<string, unknown>;
    if (typeof p.variant_id === 'string') return p.variant_id;
    if (typeof p.order_item_id === 'string') {
      const r = await sql<any>`SELECT variant_id FROM orders.order_items WHERE id=${p.order_item_id}::uuid`.execute(trx);
      return r.rows[0]?.variant_id ? String(r.rows[0].variant_id) : null;
    }
    return null;
  }
}
