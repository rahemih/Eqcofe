import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ACTOR_TYPES, ActorType } from './auth.decorators';

@Injectable()
export class ActorTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required=this.reflector.getAllAndOverride<ActorType[]>(REQUIRED_ACTOR_TYPES,[context.getHandler(),context.getClass()])??[];
    if(required.length===0)return true;
    const req=context.switchToHttp().getRequest<any>();
    if(!req.actor || !required.includes(req.actor.type)) throw new ForbiddenException('ACTOR_TYPE_FORBIDDEN');
    return true;
  }
}
