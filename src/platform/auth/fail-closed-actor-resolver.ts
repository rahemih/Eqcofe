import { Injectable } from '@nestjs/common';
import { ActorResolverPort } from './actor-resolver.port';
import { ExecutionActor } from '../../shared/application/execution-context';

@Injectable()
export class FailClosedActorResolver implements ActorResolverPort {
  async resolve(_request: unknown): Promise<ExecutionActor | null> {
    return null;
  }
}
