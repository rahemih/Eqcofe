import { DomainError } from '../../../shared/errors/domain-error';
const COMMON = new Set(['password','password123','12345678901234','qwertyuiopasdf','administrator']);
export class PasswordPolicy {
  static assertValid(password:string):void {
    if(typeof password!=='string' || password.length<14 || password.length>128) throw new DomainError('PASSWORD_POLICY_FAILED','رمز عبور باید حداقل ۱۴ کاراکتر و غیرقابل حدس باشد.');
    if(COMMON.has(password.toLowerCase())) throw new DomainError('PASSWORD_POLICY_FAILED','رمز عبور باید حداقل ۱۴ کاراکتر و غیرقابل حدس باشد.');
  }
}
