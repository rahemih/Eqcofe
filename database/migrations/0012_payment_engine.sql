BEGIN;
CREATE SCHEMA IF NOT EXISTS payments;
ALTER TABLE cart.checkouts ADD COLUMN IF NOT EXISTS guest_order_access_expires_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS ix_checkout_guest_access_expiry ON cart.checkouts(guest_order_access_expires_at) WHERE status='order_created' AND customer_id IS NULL;
CREATE TABLE IF NOT EXISTS payments.payments (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
 provider_key text NOT NULL,
 amount_toman bigint NOT NULL CHECK(amount_toman>0),
 status text NOT NULL CHECK(status IN ('initiating','pending','paid','failed','cancelled','unknown','late_received','refund_required','refunded')),
 authority text NULL,
 provider_reference text NULL,
 redirect_url text NULL,
 expires_at timestamptz NULL,
 paid_at timestamptz NULL,
 failure_code text NULL,
 reconciliation_required boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_key,authority), UNIQUE(provider_key,provider_reference)
);
ALTER TABLE orders.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','pending','paid','partially_refunded','refund_required','refunded'));
ALTER TABLE orders.orders ADD COLUMN IF NOT EXISTS payment_id uuid NULL REFERENCES payments.payments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_payment ON orders.orders(payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_order_live ON payments.payments(order_id) WHERE status IN ('initiating','pending','paid','unknown','late_received','refund_required');
CREATE INDEX IF NOT EXISTS ix_payments_status_updated ON payments.payments(status,updated_at,id);
CREATE TABLE IF NOT EXISTS payments.attempts (
 id uuid PRIMARY KEY,payment_id uuid NOT NULL REFERENCES payments.payments(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('initiate','verify','webhook','reconcile','refund')),
 outcome text NOT NULL CHECK(outcome IN ('started','succeeded','failed','unknown')),
 provider_code text NULL,provider_message text NULL,request_fingerprint text NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_payment_attempts_payment_time ON payments.attempts(payment_id,created_at,id);
CREATE TABLE IF NOT EXISTS payments.webhook_inbox (
 id uuid PRIMARY KEY,provider_key text NOT NULL,external_event_id text NOT NULL,payload_hash text NOT NULL,
 status text NOT NULL CHECK(status IN ('received','processed','failed')),
 payment_id uuid NULL REFERENCES payments.payments(id) ON DELETE SET NULL,
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),last_error_code text NULL,
 received_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_key,external_event_id)
);
CREATE INDEX IF NOT EXISTS ix_payment_webhook_retry ON payments.webhook_inbox(status,updated_at,id) WHERE status<>'processed';
CREATE TABLE IF NOT EXISTS payments.refunds (
 id uuid PRIMARY KEY,payment_id uuid NOT NULL REFERENCES payments.payments(id) ON DELETE RESTRICT,
 amount_toman bigint NOT NULL CHECK(amount_toman>0),status text NOT NULL CHECK(status IN ('requested','approved','processing','succeeded','failed','unknown','rejected','cancelled')),
 reason_code text NOT NULL,provider_reference text NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_refunds_payment ON payments.refunds(payment_id,created_at,id);
CREATE OR REPLACE FUNCTION payments.assert_refund_cap(p_payment uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE paid bigint; total bigint;
BEGIN
 SELECT amount_toman INTO paid FROM payments.payments WHERE id=p_payment;
 SELECT COALESCE(sum(amount_toman),0) INTO total FROM payments.refunds WHERE payment_id=p_payment AND status IN ('requested','approved','processing','succeeded','unknown');
 IF total>paid THEN RAISE EXCEPTION 'REFUND_EXCEEDS_PAYMENT'; END IF;
END $$;
CREATE OR REPLACE FUNCTION payments.trg_refund_cap() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM payments.assert_refund_cap(COALESCE(NEW.payment_id,OLD.payment_id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_refund_cap ON payments.refunds;
CREATE CONSTRAINT TRIGGER trg_refund_cap AFTER INSERT OR UPDATE OR DELETE ON payments.refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payments.trg_refund_cap();

CREATE OR REPLACE FUNCTION payments.assert_payment_order_amount(p_payment uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE a bigint; t bigint;
BEGIN
 SELECT p.amount_toman,o.total_toman INTO a,t FROM payments.payments p JOIN orders.orders o ON o.id=p.order_id WHERE p.id=p_payment;
 IF a IS NOT NULL AND a<>t THEN RAISE EXCEPTION 'PAYMENT_ORDER_AMOUNT_MISMATCH'; END IF;
END $$;
CREATE OR REPLACE FUNCTION payments.trg_payment_order_amount() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM payments.assert_payment_order_amount(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_payment_order_amount ON payments.payments;
CREATE CONSTRAINT TRIGGER trg_payment_order_amount AFTER INSERT OR UPDATE OF amount_toman,order_id ON payments.payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payments.trg_payment_order_amount();

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('payments.view','payments','مشاهده پرداخت‌ها','high'),
 ('payments.reconcile','payments','تطبیق و بازیابی پرداخت','critical'),
 ('refund.view','payments','مشاهده بازپرداخت‌ها','high'),
 ('refund.create','payments','ایجاد درخواست بازپرداخت','critical'),
 ('refund.approve','payments','تایید بازپرداخت','critical'),
 ('refund.reject','payments','رد بازپرداخت','critical'),
 ('refund.process','payments','پردازش بازپرداخت','critical'),
 ('refund.cancel','payments','لغو بازپرداخت','critical')
ON CONFLICT(key) DO NOTHING;
COMMIT;
