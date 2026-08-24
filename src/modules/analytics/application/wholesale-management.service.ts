import { Injectable } from '@nestjs/common';
import { WholesaleApplicationStatus } from '../domain/analytics-read-model';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

export interface WholesaleManagementRow {
  applicationId: string;
  customerId: string;
  status: WholesaleApplicationStatus;
  submittedAt: Date;
  reviewStartedAt: Date | null;
  reviewedAt: Date | null;
  sourceWatermark: Date;
}

export interface WholesaleManagementReadModel {
  applicationCount: number;
  submittedCount: number;
  underReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  decidedCount: number;
  approvalRateBps: number;
  averageDecisionSeconds: number;
  sourceWatermark: Date | null;
  rows: WholesaleManagementRow[];
}

const MAX_LIMIT = 500;
const STATUSES = new Set<WholesaleApplicationStatus>(['submitted', 'under_review', 'approved', 'rejected']);

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return MAX_LIMIT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) throw new Error('ANALYTICS_LIMIT_INVALID');
  return n;
}

function parseDate(value: unknown, code: string): Date {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) throw new Error(code);
  return date;
}

function parseNullableDate(value: unknown, code: string): Date | null {
  return value == null ? null : parseDate(value, code);
}

function parseStatus(value: unknown): WholesaleApplicationStatus {
  const status = String(value) as WholesaleApplicationStatus;
  if (!STATUSES.has(status)) throw new Error('ANALYTICS_WHOLESALE_STATUS_INVALID');
  return status;
}

function assertLifecycle(row: WholesaleManagementRow): void {
  if (row.reviewStartedAt && row.reviewStartedAt < row.submittedAt) throw new Error('ANALYTICS_WHOLESALE_TIMELINE_INVALID');
  if (row.reviewedAt && (!row.reviewStartedAt || row.reviewedAt < row.reviewStartedAt)) throw new Error('ANALYTICS_WHOLESALE_TIMELINE_INVALID');
  if (row.status === 'submitted' && (row.reviewStartedAt || row.reviewedAt)) throw new Error('ANALYTICS_WHOLESALE_STATE_INVALID');
  if (row.status === 'under_review' && (!row.reviewStartedAt || row.reviewedAt)) throw new Error('ANALYTICS_WHOLESALE_STATE_INVALID');
  if ((row.status === 'approved' || row.status === 'rejected') && (!row.reviewStartedAt || !row.reviewedAt)) {
    throw new Error('ANALYTICS_WHOLESALE_STATE_INVALID');
  }
}

@Injectable()
export class WholesaleManagementService {
  constructor(private readonly repository: AnalyticsProjectionRepository) {}

  async read(limitInput?: unknown): Promise<WholesaleManagementReadModel> {
    const rows: WholesaleManagementRow[] = (await this.repository.wholesaleApplicationMetrics(parseLimit(limitInput))).map((row: any) => {
      const projected: WholesaleManagementRow = {
        applicationId: String(row.application_id),
        customerId: String(row.customer_id),
        status: parseStatus(row.status),
        submittedAt: parseDate(row.submitted_at, 'ANALYTICS_WHOLESALE_SUBMITTED_AT_INVALID'),
        reviewStartedAt: parseNullableDate(row.review_started_at, 'ANALYTICS_WHOLESALE_REVIEW_STARTED_AT_INVALID'),
        reviewedAt: parseNullableDate(row.reviewed_at, 'ANALYTICS_WHOLESALE_REVIEWED_AT_INVALID'),
        sourceWatermark: parseDate(row.source_watermark, 'ANALYTICS_SOURCE_WATERMARK_INVALID'),
      };
      assertLifecycle(projected);
      return projected;
    });

    let submittedCount = 0;
    let underReviewCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let totalDecisionSeconds = 0;
    let sourceWatermark: Date | null = null;

    for (const row of rows) {
      if (row.status === 'submitted') submittedCount += 1;
      else if (row.status === 'under_review') underReviewCount += 1;
      else if (row.status === 'approved') approvedCount += 1;
      else rejectedCount += 1;

      if (row.reviewedAt) {
        const seconds = Math.floor((row.reviewedAt.getTime() - row.submittedAt.getTime()) / 1000);
        const next = totalDecisionSeconds + seconds;
        if (!Number.isSafeInteger(seconds) || seconds < 0 || !Number.isSafeInteger(next)) {
          throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
        }
        totalDecisionSeconds = next;
      }
      if (!sourceWatermark || row.sourceWatermark > sourceWatermark) sourceWatermark = row.sourceWatermark;
    }

    const decidedCount = approvedCount + rejectedCount;
    return {
      applicationCount: rows.length,
      submittedCount,
      underReviewCount,
      approvedCount,
      rejectedCount,
      decidedCount,
      approvalRateBps: decidedCount === 0 ? 0 : Math.round((approvedCount * 10_000) / decidedCount),
      averageDecisionSeconds: decidedCount === 0 ? 0 : Math.floor(totalDecisionSeconds / decidedCount),
      sourceWatermark,
      rows,
    };
  }
}
