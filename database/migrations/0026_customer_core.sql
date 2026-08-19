BEGIN;

-- EQCOFE Step 42 / A3 — Customer Core persistence.
-- Identity continues to own authentication/session state. Customer owns only
-- profile classification, address book, wishlist and wholesale application history.

CREATE TABLE IF NOT EXISTS customer.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  recipient_name varchar(150) NOT NULL CHECK(length(btrim(recipient_name)) BETWEEN 1 AND 150),
  recipient_mobile varchar(20) NOT NULL CHECK(recipient_mobile ~ '^09[0-9]{9}$'),
  province_id uuid NOT NULL,
  city_id uuid NOT NULL,
  postal_code varchar(10) NOT NULL CHECK(postal_code ~ '^[0-9]{10}$'),
  address_line varchar(1000) NOT NULL CHECK(length(btrim(address_line)) BETWEEN 1 AND 1000),
  building_no varchar(30) NULL CHECK(building_no IS NULL OR length(btrim(building_no)) BETWEEN 1 AND 30),
  unit_no varchar(30) NULL CHECK(unit_no IS NULL OR length(btrim(unit_no)) BETWEEN 1 AND 30),
  location_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(location_metadata)='object'),
  is_default_shipping boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_addresses_one_default_shipping
  ON customer.addresses(customer_id) WHERE is_default_shipping;
CREATE INDEX IF NOT EXISTS ix_customer_addresses_customer_created
  ON customer.addresses(customer_id,created_at DESC,id);

CREATE TABLE IF NOT EXISTS customer.wishlist_items (
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(customer_id,product_id)
);
CREATE INDEX IF NOT EXISTS ix_customer_wishlist_product
  ON customer.wishlist_items(product_id,customer_id);

CREATE TABLE IF NOT EXISTS customer.wholesale_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  business_name varchar(250) NOT NULL CHECK(length(btrim(business_name)) BETWEEN 1 AND 250),
  manager_name varchar(200) NOT NULL CHECK(length(btrim(manager_name)) BETWEEN 1 AND 200),
  business_type varchar(100) NOT NULL CHECK(length(btrim(business_type)) BETWEEN 1 AND 100),
  province_id uuid NOT NULL,
  city_id uuid NOT NULL,
  business_identifier varchar(100) NULL CHECK(business_identifier IS NULL OR length(btrim(business_identifier)) BETWEEN 1 AND 100),
  note varchar(4000) NULL CHECK(note IS NULL OR length(btrim(note)) BETWEEN 1 AND 4000),
  status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','approved','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  review_started_at timestamptz NULL,
  reviewed_at timestamptz NULL,
  reviewer_staff_id uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE RESTRICT,
  decision_note varchar(2000) NULL CHECK(decision_note IS NULL OR length(btrim(decision_note)) BETWEEN 1 AND 2000),
  rejection_reason varchar(2000) NULL CHECK(rejection_reason IS NULL OR length(btrim(rejection_reason)) BETWEEN 2 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK(version>0),
  CONSTRAINT ck_customer_wholesale_application_state_fields CHECK(
    (status='submitted' AND review_started_at IS NULL AND reviewed_at IS NULL AND reviewer_staff_id IS NULL AND decision_note IS NULL AND rejection_reason IS NULL)
    OR
    (status='under_review' AND review_started_at IS NOT NULL AND reviewed_at IS NULL AND reviewer_staff_id IS NOT NULL AND decision_note IS NULL AND rejection_reason IS NULL)
    OR
    (status='approved' AND review_started_at IS NOT NULL AND reviewed_at IS NOT NULL AND reviewer_staff_id IS NOT NULL AND rejection_reason IS NULL)
    OR
    (status='rejected' AND review_started_at IS NOT NULL AND reviewed_at IS NOT NULL AND reviewer_staff_id IS NOT NULL AND rejection_reason IS NOT NULL)
  ),
  CHECK(review_started_at IS NULL OR review_started_at>=submitted_at),
  CHECK(reviewed_at IS NULL OR (review_started_at IS NOT NULL AND reviewed_at>=review_started_at))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_wholesale_one_active_application
  ON customer.wholesale_applications(customer_id)
  WHERE status IN ('submitted','under_review');
CREATE INDEX IF NOT EXISTS ix_customer_wholesale_customer_history
  ON customer.wholesale_applications(customer_id,submitted_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS ix_customer_wholesale_admin_queue
  ON customer.wholesale_applications(status,submitted_at,id)
  WHERE status IN ('submitted','under_review');
CREATE INDEX IF NOT EXISTS ix_customer_wholesale_reviewer
  ON customer.wholesale_applications(reviewer_staff_id,review_started_at DESC,id)
  WHERE reviewer_staff_id IS NOT NULL;

-- Serialize application creation/activation with customer promotion and fail closed
-- for disabled/anonymized or already-wholesale customers.
CREATE OR REPLACE FUNCTION customer.assert_wholesale_application_customer_eligible()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE customer_row record;
BEGIN
  IF NEW.status NOT IN ('submitted','under_review') THEN RETURN NEW; END IF;
  SELECT customer_type,status INTO customer_row
  FROM customer.customers
  WHERE id=NEW.customer_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CUSTOMER_NOT_FOUND'; END IF;
  IF customer_row.status<>'active' THEN RAISE EXCEPTION 'CUSTOMER_NOT_ACTIVE'; END IF;
  IF customer_row.customer_type<>'retail' THEN RAISE EXCEPTION 'CUSTOMER_ALREADY_WHOLESALE'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_customer_wholesale_application_eligible ON customer.wholesale_applications;
CREATE TRIGGER trg_customer_wholesale_application_eligible
BEFORE INSERT OR UPDATE OF customer_id,status ON customer.wholesale_applications
FOR EACH ROW EXECUTE FUNCTION customer.assert_wholesale_application_customer_eligible();

-- Only submitted -> under_review -> approved/rejected is legal. Terminal decisions
-- are immutable and reviewer ownership cannot be reassigned after review starts.
CREATE OR REPLACE FUNCTION customer.guard_wholesale_application_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.status IN ('approved','rejected') THEN RAISE EXCEPTION 'CUSTOMER_WHOLESALE_DECISION_IMMUTABLE'; END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('approved','rejected') THEN
    RAISE EXCEPTION 'CUSTOMER_WHOLESALE_DECISION_IMMUTABLE';
  END IF;

  IF OLD.customer_id<>NEW.customer_id THEN
    RAISE EXCEPTION 'CUSTOMER_WHOLESALE_OWNERSHIP_IMMUTABLE';
  END IF;

  IF OLD.status='under_review' AND NEW.reviewer_staff_id IS DISTINCT FROM OLD.reviewer_staff_id THEN
    RAISE EXCEPTION 'CUSTOMER_WHOLESALE_REVIEWER_IMMUTABLE';
  END IF;

  IF NEW.status<>OLD.status AND NOT (
    (OLD.status='submitted' AND NEW.status='under_review') OR
    (OLD.status='under_review' AND NEW.status IN ('approved','rejected'))
  ) THEN
    RAISE EXCEPTION 'CUSTOMER_WHOLESALE_INVALID_TRANSITION';
  END IF;

  IF NEW.version<>OLD.version+1 THEN
    RAISE EXCEPTION 'CUSTOMER_WHOLESALE_VERSION_MUST_INCREMENT';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_customer_wholesale_transition ON customer.wholesale_applications;
CREATE TRIGGER trg_customer_wholesale_transition
BEFORE UPDATE OR DELETE ON customer.wholesale_applications
FOR EACH ROW EXECUTE FUNCTION customer.guard_wholesale_application_transition();

-- Direct client/service promotion is rejected unless an approved application exists.
-- A7 must approve the locked application first and promote this row in the same tx.
CREATE OR REPLACE FUNCTION customer.guard_customer_type_promotion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.customer_type IS NOT DISTINCT FROM OLD.customer_type THEN RETURN NEW; END IF;
  IF OLD.customer_type='retail' AND NEW.customer_type='wholesale' THEN
    IF NOT EXISTS(
      SELECT 1 FROM customer.wholesale_applications wa
      WHERE wa.customer_id=NEW.id AND wa.status='approved'
    ) THEN RAISE EXCEPTION 'CUSTOMER_WHOLESALE_APPROVAL_REQUIRED'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_customer_type_promotion_guard ON customer.customers;
CREATE TRIGGER trg_customer_type_promotion_guard
BEFORE UPDATE OF customer_type ON customer.customers
FOR EACH ROW EXECUTE FUNCTION customer.guard_customer_type_promotion();

-- Deferred commit-time integrity guarantees that an approved application and the
-- authoritative customer classification cannot commit independently.
CREATE OR REPLACE FUNCTION customer.assert_approved_application_promoted()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='approved' AND NOT EXISTS(
    SELECT 1 FROM customer.customers c
    WHERE c.id=NEW.customer_id AND c.customer_type='wholesale'
  ) THEN RAISE EXCEPTION 'CUSTOMER_WHOLESALE_APPROVAL_NOT_PROMOTED'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_customer_wholesale_approved_promoted ON customer.wholesale_applications;
CREATE CONSTRAINT TRIGGER trg_customer_wholesale_approved_promoted
AFTER INSERT OR UPDATE OF status ON customer.wholesale_applications
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION customer.assert_approved_application_promoted();

COMMIT;
