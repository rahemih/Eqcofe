BEGIN;

ALTER TABLE orders.orders ADD COLUMN IF NOT EXISTS settlement_payment_id uuid NULL REFERENCES payments.payments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_settlement_payment ON orders.orders(settlement_payment_id) WHERE settlement_payment_id IS NOT NULL;

ALTER TABLE payments.payments
  ADD COLUMN IF NOT EXISTS callback_state_hash text NULL,
  ADD COLUMN IF NOT EXISTS callback_state_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS callback_state_consumed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS provider_check_token uuid NULL,
  ADD COLUMN IF NOT EXISTS provider_check_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts integer NOT NULL DEFAULT 0 CHECK(reconciliation_attempts>=0),
  ADD COLUMN IF NOT EXISTS next_reconciliation_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS manual_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_review_reason text NULL;
DROP INDEX IF EXISTS payments.ux_payments_order_live;
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_order_inflight ON payments.payments(order_id) WHERE status IN ('initiating','pending','unknown');
CREATE INDEX IF NOT EXISTS ix_payments_reconcile_due ON payments.payments(next_reconciliation_at,id)
  WHERE reconciliation_required=true AND manual_review_required=false;

ALTER TABLE payments.attempts DROP COLUMN IF EXISTS provider_message;
ALTER TABLE payments.refunds
  ADD COLUMN IF NOT EXISTS provider_key text NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts integer NOT NULL DEFAULT 0 CHECK(reconciliation_attempts>=0),
  ADD COLUMN IF NOT EXISTS next_reconciliation_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS manual_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_review_reason text NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid NULL,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN IF NOT EXISTS provider_check_token uuid NULL,
  ADD COLUMN IF NOT EXISTS provider_check_until timestamptz NULL;
UPDATE payments.refunds r SET provider_key=p.provider_key FROM payments.payments p WHERE p.id=r.payment_id AND r.provider_key IS NULL;
ALTER TABLE payments.refunds ALTER COLUMN provider_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_refund_provider_reference ON payments.refunds(provider_key,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_refunds_reconcile_due ON payments.refunds(next_reconciliation_at,id)
  WHERE reconciliation_required=true AND manual_review_required=false;

-- Serialize every Refund mutation on its parent Payment before FK/deferred-cap checks.
-- This establishes one deterministic lock order and prevents refund-cap deadlocks.
CREATE OR REPLACE FUNCTION payments.lock_refund_payment_parent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   PERFORM 1 FROM payments.payments WHERE id=NEW.payment_id FOR UPDATE;
   RETURN NEW;
 ELSIF TG_OP='DELETE' THEN
   PERFORM 1 FROM payments.payments WHERE id=OLD.payment_id FOR UPDATE;
   RETURN OLD;
 END IF;
 PERFORM 1 FROM payments.payments
 WHERE id IN (OLD.payment_id,NEW.payment_id)
 ORDER BY id
 FOR UPDATE;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_refund_parent_lock ON payments.refunds;
CREATE TRIGGER trg_refund_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON payments.refunds
FOR EACH ROW EXECUTE FUNCTION payments.lock_refund_payment_parent();

CREATE OR REPLACE FUNCTION payments.assert_refund_cap(p_payment uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE paid bigint; total bigint;
BEGIN
 SELECT amount_toman INTO paid FROM payments.payments WHERE id=p_payment FOR UPDATE;
 IF paid IS NULL THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
 SELECT COALESCE(sum(amount_toman),0) INTO total
 FROM payments.refunds
 WHERE payment_id=p_payment AND status IN ('requested','approved','processing','succeeded','unknown','failed');
 IF total>paid THEN RAISE EXCEPTION 'REFUND_EXCEEDS_PAYMENT'; END IF;
END $$;

CREATE OR REPLACE FUNCTION payments.assert_refund_state(p_refund payments.refunds) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_refund.status IN ('processing','unknown','failed','succeeded') AND p_refund.submitted_at IS NULL THEN RAISE EXCEPTION 'REFUND_SUBMISSION_REQUIRED'; END IF;
 IF p_refund.status='succeeded' AND p_refund.completed_at IS NULL THEN RAISE EXCEPTION 'REFUND_COMPLETION_REQUIRED'; END IF;
 IF p_refund.status IN ('processing','unknown') AND p_refund.provider_key IS NULL THEN RAISE EXCEPTION 'REFUND_PROVIDER_REQUIRED'; END IF;
END $$;
CREATE OR REPLACE FUNCTION payments.trg_refund_state() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM payments.assert_refund_state(NEW); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_refund_state ON payments.refunds;
CREATE CONSTRAINT TRIGGER trg_refund_state AFTER INSERT OR UPDATE ON payments.refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payments.trg_refund_state();

CREATE OR REPLACE FUNCTION payments.assert_settlement_link(p_order uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE sid uuid; ps text;
BEGIN
 SELECT settlement_payment_id,payment_status INTO sid,ps FROM orders.orders WHERE id=p_order;
 IF sid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payments.payments p WHERE p.id=sid AND p.order_id=p_order) THEN RAISE EXCEPTION 'INVALID_ORDER_SETTLEMENT_PAYMENT'; END IF;
 IF ps='paid' THEN
   IF sid IS NULL THEN RAISE EXCEPTION 'PAID_ORDER_WITHOUT_SETTLEMENT'; END IF;
   IF NOT EXISTS(SELECT 1 FROM payments.payments p WHERE p.id=sid AND p.order_id=p_order AND p.status IN ('paid','late_received','refund_required','refunded')) THEN RAISE EXCEPTION 'PAID_ORDER_INVALID_SETTLEMENT_STATE'; END IF;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION payments.trg_settlement_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM payments.assert_settlement_link(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_order_settlement_link ON orders.orders;
CREATE CONSTRAINT TRIGGER trg_order_settlement_link AFTER INSERT OR UPDATE OF settlement_payment_id,payment_status,payment_id ON orders.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payments.trg_settlement_link();

COMMIT;
