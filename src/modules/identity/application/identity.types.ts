export interface ResolvedSession {
  sessionId: string;
  accountId: string;
  actorType: 'customer' | 'staff';
  actorId: string;
  permissions: string[];
  scopes: string[];
  expiresAt: Date;
}

export interface OtpDeliveryPort { sendLoginCode(destination: string, code: string): Promise<void>; }
export const OTP_DELIVERY_PORT = Symbol('OTP_DELIVERY_PORT');
