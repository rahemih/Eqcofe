import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { CampaignAggregate } from '../domain/campaign.aggregate';
import { campaignEvent } from '../domain/marketing.events';
import { CampaignRepository } from '../infrastructure/campaign.repository';

@Injectable()
export class CampaignService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repo: CampaignRepository,
    private readonly ctx: RequestContextStore,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxWriter,
  ) {}

  async list(status?: string) {
    this.staff();
    return { items: await this.repo.list(status) };
  }

  async get(id: string) {
    this.staff();
    const row = await this.repo.byId(this.uuid(id));
    if (!row) throw new DomainError('CAMPAIGN_NOT_FOUND', 'کمپین پیدا نشد.');
    return row;
  }

  async create(input: { name: string; description?: string | null; starts_at: string | Date; ends_at: string | Date }) {
    const actorId = this.staff();
    const id = randomUUID();
    const startsAt = this.date(input.starts_at, 'starts_at');
    const endsAt = this.date(input.ends_at, 'ends_at');
    const aggregate = CampaignAggregate.create({ id, name: String(input.name ?? ''), startsAt, endsAt });
    const snapshot = aggregate.snapshot();
    const description = this.description(input.description);
    const request = this.ctx.require();
    return this.tx.run(async ex => {
      const row = await this.repo.create(ex, { id, name: snapshot.name, description, startsAt, endsAt, actorId });
      await this.outbox.append(ex, [campaignEvent('marketing.campaign.created.v1', id, 1, { status: 'draft', starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })], request);
      await this.audit.writeWith(ex, { actorType: 'staff', actorId, action: 'marketing.campaign.create', resourceType: 'marketing_campaign', resourceId: id, afterData: { name: snapshot.name, status: 'draft', starts_at: startsAt, ends_at: endsAt }, requestId: request.requestId, traceId: request.traceId });
      return row;
    });
  }

  async activate(id: string, expectedVersion: number) { return this.transition(id, expectedVersion, ['draft', 'paused'], 'active'); }
  async pause(id: string, expectedVersion: number) { return this.transition(id, expectedVersion, ['active'], 'paused'); }
  async end(id: string, expectedVersion: number) { return this.transition(id, expectedVersion, ['draft', 'active', 'paused'], 'ended'); }
  async archive(id: string, expectedVersion: number) { return this.transition(id, expectedVersion, ['draft', 'paused', 'ended'], 'archived'); }

  async reschedule(id: string, expectedVersion: number, input: { starts_at: string | Date; ends_at: string | Date }) {
    const actorId = this.staff();
    this.version(expectedVersion);
    const campaignId = this.uuid(id);
    const startsAt = this.date(input.starts_at, 'starts_at');
    const endsAt = this.date(input.ends_at, 'ends_at');
    const request = this.ctx.require();
    return this.tx.run(async ex => {
      const before = await this.repo.byId(campaignId, ex, true);
      if (!before) throw new DomainError('CAMPAIGN_NOT_FOUND', 'کمپین پیدا نشد.');
      if (Number(before.version) !== expectedVersion) throw new DomainError('CAMPAIGN_VERSION_CONFLICT', 'نسخه کمپین تغییر کرده است.');
      const aggregate = CampaignAggregate.create({ id: campaignId, name: String(before.name), startsAt: new Date(before.starts_at), endsAt: new Date(before.ends_at) });
      if (!['draft', 'paused'].includes(String(before.status))) throw new DomainError('CAMPAIGN_RESCHEDULE_INVALID', 'بازه زمانی فقط برای کمپین Draft یا Paused قابل تغییر است.');
      aggregate.reschedule(startsAt, endsAt);
      const row = await this.repo.reschedule(ex, { id: campaignId, expectedVersion, startsAt, endsAt, actorId });
      if (!row) throw new DomainError('CAMPAIGN_VERSION_CONFLICT', 'تغییر همزمان مانع ذخیره شد.');
      await this.outbox.append(ex, [campaignEvent('marketing.campaign.rescheduled.v1', campaignId, Number(row.version), { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })], request);
      await this.audit.writeWith(ex, { actorType: 'staff', actorId, action: 'marketing.campaign.reschedule', resourceType: 'marketing_campaign', resourceId: campaignId, beforeData: { starts_at: before.starts_at, ends_at: before.ends_at, version: before.version }, afterData: { starts_at: startsAt, ends_at: endsAt, version: row.version }, requestId: request.requestId, traceId: request.traceId });
      return row;
    });
  }

  private async transition(id: string, expectedVersion: number, from: string[], to: string) {
    const actorId = this.staff();
    this.version(expectedVersion);
    const campaignId = this.uuid(id);
    const request = this.ctx.require();
    return this.tx.run(async ex => {
      const before = await this.repo.byId(campaignId, ex, true);
      if (!before) throw new DomainError('CAMPAIGN_NOT_FOUND', 'کمپین پیدا نشد.');
      if (Number(before.version) !== expectedVersion) throw new DomainError('CAMPAIGN_VERSION_CONFLICT', 'نسخه کمپین تغییر کرده است.');
      if (!from.includes(String(before.status))) throw new DomainError('CAMPAIGN_INVALID_STATE', 'تغییر وضعیت کمپین مجاز نیست.');
      if (to === 'active' && new Date() >= new Date(before.ends_at)) throw new DomainError('CAMPAIGN_ENDED', 'کمپین منقضی شده است.');
      const row = await this.repo.transition(ex, { id: campaignId, expectedVersion, from, to, actorId });
      if (!row) throw new DomainError('CAMPAIGN_VERSION_CONFLICT', 'تغییر همزمان مانع ذخیره شد.');
      await this.outbox.append(ex, [campaignEvent(`marketing.campaign.${to}.v1`, campaignId, Number(row.version), { previous_status: before.status, status: to })], request);
      await this.audit.writeWith(ex, { actorType: 'staff', actorId, action: `marketing.campaign.${to}`, resourceType: 'marketing_campaign', resourceId: campaignId, beforeData: { status: before.status, version: before.version }, afterData: { status: to, version: row.version }, requestId: request.requestId, traceId: request.traceId });
      return row;
    });
  }

  private staff(): string {
    const actor = this.ctx.get()?.actor;
    if (actor?.type !== 'staff' || !actor.id) throw new DomainError('STAFF_REQUIRED', 'دسترسی مدیر الزامی است.');
    return actor.id;
  }
  private uuid(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new DomainError('VALIDATION_ERROR', 'شناسه معتبر نیست.');
    return value;
  }
  private version(value: number): number {
    if (!Number.isSafeInteger(value) || value < 1) throw new DomainError('VERSION_REQUIRED', 'نسخه معتبر الزامی است.');
    return value;
  }
  private date(value: string | Date, field: string): Date {
    const d = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(d.getTime())) throw new DomainError('VALIDATION_ERROR', `${field} معتبر نیست.`);
    return d;
  }
  private description(value?: string | null): string | null {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const text = String(value).trim();
    if (text.length > 2000) throw new DomainError('VALIDATION_ERROR', 'توضیحات کمپین بیش از حد طولانی است.');
    return text;
  }
}
