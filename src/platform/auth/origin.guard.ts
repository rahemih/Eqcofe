import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SAFE = new Set(['GET','HEAD','OPTIONS']);
function hasAuthCookie(cookie:string):boolean { return /(?:^|;\s*)(?:__Host-)?eqcofe_(?:admin_)?session=/.test(cookie) || /(?:^|;\s*)(?:__Host-)?eqcofe_admin_pre_auth=/.test(cookie); }

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config:ConfigService){}
  canActivate(context:ExecutionContext):boolean {
    const req=context.switchToHttp().getRequest<any>();
    const method=String(req.method??'GET').toUpperCase();
    if(SAFE.has(method))return true;
    const origin=typeof req.headers?.origin==='string'?req.headers.origin:undefined;
    const cookie=String(req.headers?.cookie??'');
    const allowed=new Set(String(this.config.get<string>('BROWSER_ALLOWED_ORIGINS','')).split(',').map(x=>x.trim()).filter(Boolean));
    if(origin && !allowed.has(origin)) throw new ForbiddenException('ORIGIN_NOT_ALLOWED');
    if(hasAuthCookie(cookie) && !origin) throw new ForbiddenException('ORIGIN_REQUIRED');
    return true;
  }
}
