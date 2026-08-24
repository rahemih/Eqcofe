BEGIN;

-- Step 51 / A8 — Analytics-owned projection of the Customer-owned wholesale
-- application lifecycle. This table is derived read-side state only and has no
-- foreign key or mutation authority over the Customer domain.
CREATE TABLE analytics.wholesale_application_metrics (
  application_id uuid PRIMARY KEY,
  customer_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted','under_review','approved','rejected')),
  submitted_at timestamptz NOT NULL,
  review_started_at timestamptz NULL,
  reviewed_at timestamptz NULL,
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_wholesale_application_state_fields CHECK (
    (status='submitted' AND review_started_at IS NULL AND reviewed_at IS NULL)
    OR (status='under_review' AND review_started_at IS NOT NULL AND reviewed_at IS NULL)
    OR (status IN ('approved','rejected') AND review_started_at IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CHECK (review_started_at IS NULL OR review_started_at >= submitted_at),
  CHECK (reviewed_at IS NULL OR (review_started_at IS NOT NULL AND reviewed_at >= review_started_at))
);

CREATE INDEX analytics_wholesale_application_status_idx
  ON analytics.wholesale_application_metrics(status, submitted_at DESC, application_id);
CREATE INDEX analytics_wholesale_application_watermark_idx
  ON analytics.wholesale_application_metrics(source_watermark DESC);

COMMIT;
