import { DomainError } from '../../../shared/errors/domain-error';
import { CampaignStatus } from './marketing.types';

export interface CampaignSnapshot {
  id: string;
  name: string;
  status: CampaignStatus;
  startsAt: Date;
  endsAt: Date;
}

export class CampaignAggregate {
  private constructor(private state: CampaignSnapshot) {}

  static create(input: { id: string; name: string; startsAt: Date; endsAt: Date }): CampaignAggregate {
    const name = input.name.trim();
    if (!input.id || !name) throw new DomainError('CAMPAIGN_REQUIRED_FIELDS', 'شناسه و نام کمپین الزامی هستند.');
    if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime()) || !(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime()) || input.startsAt >= input.endsAt) {
      throw new DomainError('CAMPAIGN_INVALID_WINDOW', 'بازه زمانی کمپین معتبر نیست.');
    }
    return new CampaignAggregate({ id: input.id, name, status: 'draft', startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) });
  }

  get status(): CampaignStatus { return this.state.status; }

  activate(now = new Date()): void {
    if (this.state.status !== 'draft' && this.state.status !== 'paused') throw new DomainError('CAMPAIGN_ACTIVATION_INVALID', 'کمپین از وضعیت فعلی قابل فعال‌سازی نیست.');
    if (now >= this.state.endsAt) throw new DomainError('CAMPAIGN_ENDED', 'کمپین منقضی شده است.');
    this.state.status = 'active';
  }

  pause(): void {
    if (this.state.status !== 'active') throw new DomainError('CAMPAIGN_PAUSE_INVALID', 'فقط کمپین فعال قابل توقف موقت است.');
    this.state.status = 'paused';
  }

  end(): void {
    if (this.state.status === 'archived' || this.state.status === 'ended') return;
    this.state.status = 'ended';
  }

  archive(): void {
    if (this.state.status === 'active') throw new DomainError('CAMPAIGN_ARCHIVE_ACTIVE', 'کمپین فعال ابتدا باید متوقف یا پایان داده شود.');
    this.state.status = 'archived';
  }

  reschedule(startsAt: Date, endsAt: Date): void {
    if (this.state.status !== 'draft' && this.state.status !== 'paused') throw new DomainError('CAMPAIGN_RESCHEDULE_INVALID', 'بازه زمانی فقط برای کمپین Draft یا Paused قابل تغییر است.');
    if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || !(endsAt instanceof Date) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) throw new DomainError('CAMPAIGN_INVALID_WINDOW', 'بازه زمانی کمپین معتبر نیست.');
    this.state.startsAt = new Date(startsAt);
    this.state.endsAt = new Date(endsAt);
  }

  snapshot(): CampaignSnapshot {
    return { ...this.state, startsAt: new Date(this.state.startsAt), endsAt: new Date(this.state.endsAt) };
  }
}
