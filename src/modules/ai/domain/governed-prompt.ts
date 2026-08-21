import { DomainError } from '../../../shared/errors/domain-error';
import { AiOperationKind } from './ai-provider-contracts';

export type GovernedPromptStatus = 'draft' | 'active' | 'disabled';

export interface GovernedPromptVersionInput {
  promptKey: unknown;
  operation: AiOperationKind;
  version: unknown;
  template: unknown;
}

export interface GovernedPromptVersion {
  promptKey: string;
  operation: AiOperationKind;
  version: number;
  template: string;
}

const KEY_RE = /^[a-z][a-z0-9-]{2,79}$/;

export function normalizePromptKey(value: unknown): string {
  const key = String(value ?? '').trim().toLowerCase();
  if (!KEY_RE.test(key)) throw new DomainError('AI_PROMPT_KEY_INVALID', 'کلید پرامپت معتبر نیست.');
  return key;
}

export function createGovernedPromptVersion(input: GovernedPromptVersionInput): GovernedPromptVersion {
  const version = Number(input.version);
  if (!Number.isSafeInteger(version) || version < 1) throw new DomainError('AI_PROMPT_VERSION_INVALID', 'نسخه پرامپت معتبر نیست.');
  const template = String(input.template ?? '').trim();
  if (template.length < 1 || template.length > 20_000) throw new DomainError('AI_PROMPT_TEMPLATE_INVALID', 'متن پرامپت معتبر نیست.');
  if (!['product_qa', 'draft_content'].includes(input.operation)) throw new DomainError('AI_PROMPT_OPERATION_INVALID', 'کاربرد پرامپت معتبر نیست.');
  return { promptKey: normalizePromptKey(input.promptKey), operation: input.operation, version, template };
}
