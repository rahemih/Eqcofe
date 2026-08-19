import { ExecutionActor } from '../../shared/application/execution-context';

export interface ActorResolverPort {
  resolve(request: unknown): Promise<ExecutionActor | null>;
}
export const ACTOR_RESOLVER = Symbol('ACTOR_RESOLVER');
