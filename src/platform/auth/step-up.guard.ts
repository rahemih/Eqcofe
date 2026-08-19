import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { STEP_UP_REQUIRED } from './auth.decorators';
import { SignedTokenService } from './signed-token.service';

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(private readonly reflector:Reflector,private readonly tokens:SignedTokenService){}
  canActivate(context:ExecutionContext):boolean {
    const required=this.reflector.getAllAndOverride<boolean>(STEP_UP_REQUIRED,[context.getHandler(),context.getClass()]);
    if(!required)return true;
    const req=context.switchToHttp().getRequest<any>();
    const token=req.headers?.['x-step-up-token'];
    const p=token?this.tokens.verify(String(token),'step_up'):null;
    if(!p || p.sub!==req.actor?.accountId || p.sid!==req.actor?.sessionId) throw new ForbiddenException('STEP_UP_REQUIRED');
    return true;
  }
}
