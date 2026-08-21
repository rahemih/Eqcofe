export type PaymentAuxObservationOutcome='accepted'|'rejected'|'pending'|'unknown';

export interface PaymentAuxObservation{
  providerKey:string;
  externalReference:string|null;
  providerStatus:string;
  outcome:PaymentAuxObservationOutcome;
  observedAt:Date;
  payload:Record<string,unknown>;
}

export interface PaymentAuxInquiryInput{
  reference:string;
}

export interface PaymentAuxCommandInput{
  action:string;
  reference:string;
  idempotencyKey:string;
  payload?:Record<string,unknown>;
}
