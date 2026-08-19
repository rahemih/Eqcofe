import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
export class OtpCode {
  static generate(secret:string, context:string):{code:string;hash:string}{
    const code=String(randomInt(0,1_000_000)).padStart(6,'0');
    return {code,hash:this.hash(code,secret,context)};
  }
  static hash(code:string,secret:string,context:string):string { return createHmac('sha256',secret).update(`${context}:${code}`).digest('hex'); }
  static matches(code:string,secret:string,context:string,expected:string):boolean {
    const a=Buffer.from(this.hash(code,secret,context),'hex'); const b=Buffer.from(expected,'hex');
    return a.length===b.length && timingSafeEqual(a,b);
  }
}
