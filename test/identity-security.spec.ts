import test from 'node:test';
import assert from 'node:assert/strict';
import { PasswordPolicy } from '../src/modules/identity/domain/password-policy';
import { OtpCode } from '../src/modules/identity/domain/otp-code';
import { SessionToken } from '../src/modules/identity/domain/session-token';
import { PasswordHasher } from '../src/modules/identity/domain/password-hasher';

test('OTP hash is challenge-bound and rejects reuse across challenge ids',()=>{
  const secret='secret'; const code='123456';
  assert.notEqual(OtpCode.hash(code,secret,'a'),OtpCode.hash(code,secret,'b'));
  assert.equal(OtpCode.matches(code,secret,'a',OtpCode.hash(code,secret,'a')),true);
});

test('session tokens are opaque and hash deterministically',()=>{const a=SessionToken.generate();assert.ok(a.raw.length>=40);assert.equal(a.hash,SessionToken.hash(a.raw));assert.notEqual(a.raw,a.hash);});

test('admin password policy enforces long non-common passwords',()=>{assert.throws(()=>PasswordPolicy.assertValid('password123'));assert.doesNotThrow(()=>PasswordPolicy.assertValid('Correct-Horse-Battery-42'));});

test('scrypt password hashes verify and do not expose plaintext',()=>{const raw='Correct-Horse-Battery-42';const hash=PasswordHasher.hash(raw);assert.ok(hash.startsWith('scrypt$'));assert.equal(hash.includes(raw),false);assert.equal(PasswordHasher.verify(raw,hash),true);assert.equal(PasswordHasher.verify('wrong password value',hash),false);});
