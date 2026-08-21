import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiOperationKind } from '../domain/ai-provider-contracts';
import { AiObservabilityRepository, AiInvocationOutcome } from '../infrastructure/ai-observability.repository';

@Injectable()
export class AiObservabilityService {
  constructor(private readonly repo: AiObservabilityRepository) {}

  async record(input: {
    requestId: string;
    operation: AiOperationKind;
    promptKey: string;
    promptVersion: number;
    outcome: AiInvocationOutcome;
    providerFailureKind?: string | null;
    model?: string | null;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
  }) {
    await this.repo.append({
      id: randomUUID(),
      requestId: this.uuid(input.requestId),
      operation: input.operation,
      promptKey: this.safeText(input.promptKey, 100),
      promptVersion: this.positiveInt(input.promptVersion),
      outcome: input.outcome,
      providerFailureKind: input.providerFailureKind ? this.safeText(input.providerFailureKind, 100) : null,
      model: input.model ? this.safeText(input.model, 200) : null,
      inputTokens: this.nonNegativeInt(input.inputTokens ?? 0),
      outputTokens: this.nonNegativeInt(input.outputTokens ?? 0),
      latencyMs: this.nonNegativeInt(input.latencyMs),
    });
  }

  summary(operation: AiOperationKind, hours?: number) {
    return this.repo.summary(operation, hours);
  }

  private safeText(value: string, max: number) {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.length > max || /bearer\s+|api[_-]?key|access[_-]?token|refresh[_-]?token|secret/i.test(normalized)) {
      throw new Error('Unsafe AI observability metadata');
    }
    return normalized;
  }

  private uuid(value: string) {
    const normalized = String(value ?? '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) throw new Error('Invalid AI request id');
    return normalized;
  }

  private positiveInt(value: number) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid AI observability integer');
    return value;
  }

  private nonNegativeInt(value: number) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid AI observability integer');
    return value;
  }
}
