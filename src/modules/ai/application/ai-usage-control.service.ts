import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { AiOperationKind } from '../domain/ai-provider-contracts';
import { AiUsageRepository } from '../infrastructure/ai-usage.repository';

@Injectable()
export class AiUsageControlService {
  constructor(private readonly repo: AiUsageRepository) {}

  async reserve(input:{requestId:string;operation:AiOperationKind;providerInput:string;maxOutputTokens:number}){
    const estimatedInputTokens = Math.max(1, Math.ceil(Buffer.byteLength(input.providerInput,'utf8') / 4));
    const result = await this.repo.reserve({requestId:input.requestId,operation:input.operation,estimatedInputTokens,reservedOutputTokens:input.maxOutputTokens});
    if (result.ok) return { estimatedInputTokens, reservedCostMicros: result.reservedCostMicros };
    const code = result.reason === 'rate_limit' ? 'AI_RATE_LIMITED'
      : result.reason === 'budget_limit' ? 'AI_COST_BUDGET_EXCEEDED'
      : result.reason === 'input_limit' || result.reason === 'output_limit' ? 'AI_USAGE_LIMIT_EXCEEDED'
      : 'AI_USAGE_POLICY_UNAVAILABLE';
    throw new DomainError(code,'سقف مصرف سرویس هوشمند اجازه اجرای این درخواست را نمی‌دهد.');
  }

  async settleSuccess(requestId:string,usage:{inputTokens:number;outputTokens:number}){
    await this.repo.settle({requestId,inputTokens:this.tokens(usage.inputTokens),outputTokens:this.tokens(usage.outputTokens)});
  }

  async settleFailure(requestId:string){
    await this.repo.settle({requestId,inputTokens:0,outputTokens:0,failed:true});
  }

  private tokens(value:number){
    if(!Number.isSafeInteger(value)||value<0) throw new DomainError('AI_USAGE_INVALID','اطلاعات مصرف سرویس هوشمند معتبر نیست.');
    return value;
  }
}
