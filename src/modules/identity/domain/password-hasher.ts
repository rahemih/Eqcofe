import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PasswordPolicy } from './password-policy';

export class PasswordHasher {
  private static readonly DUMMY = PasswordHasher.hash('this-is-a-dummy-password-not-used');
  static hash(password:string):string {
    PasswordPolicy.assertValid(password);
    const salt=randomBytes(16).toString('hex');
    return `scrypt$${salt}$${scryptSync(password,salt,64).toString('hex')}`;
  }
  static verify(password:string,encoded:string|null):boolean {
    const target=encoded??this.DUMMY; const [scheme,salt,hash]=target.split('$');
    if(scheme!=='scrypt'||!salt||!hash)return false;
    const actual=scryptSync(String(password??''),salt,64);const expected=Buffer.from(hash,'hex');
    return actual.length===expected.length&&timingSafeEqual(actual,expected)&&encoded!==null;
  }
}
