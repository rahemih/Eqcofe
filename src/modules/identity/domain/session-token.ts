import { createHash, randomBytes } from 'node:crypto';

export class SessionToken {
  static generate(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hash(raw) };
  }
  static hash(raw: string): string { return createHash('sha256').update(raw, 'utf8').digest('hex'); }
}
