import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface TokenPayload { typ: string; sub: string; exp: number; [key:string]: unknown; }
@Injectable()
export class SignedTokenService {
  constructor(private readonly config:ConfigService){}
  private secret():string { return this.config.getOrThrow<string>('AUTH_TOKEN_HMAC_SECRET'); }
  sign(payload:TokenPayload):string { const body=Buffer.from(JSON.stringify(payload)).toString('base64url'); const sig=createHmac('sha256',this.secret()).update(body).digest('base64url'); return `${body}.${sig}`; }
  verify(token:string,typ:string):TokenPayload|null { try { const [body,sig]=token.split('.'); if(!body||!sig)return null; const expected=createHmac('sha256',this.secret()).update(body).digest(); const actual=Buffer.from(sig,'base64url'); if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null; const p=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as TokenPayload; if(p.typ!==typ||!p.sub||!p.exp||p.exp<Date.now())return null; return p; } catch{return null;} }
}
