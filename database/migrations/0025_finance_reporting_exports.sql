BEGIN;
CREATE TABLE IF NOT EXISTS finance.report_jobs(
  id uuid PRIMARY KEY, report_key text NOT NULL, status text NOT NULL CHECK(status IN('queued','running','completed','failed','cancelled')),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb, result_json jsonb, error_code text, error_message text,
  started_at timestamptz, completed_at timestamptz, cancelled_at timestamptz, cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_finance_report_jobs_created ON finance.report_jobs(created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS finance.exports(
  id uuid PRIMARY KEY, report_job_id uuid NOT NULL REFERENCES finance.report_jobs(id),
  status text NOT NULL CHECK(status IN('queued','running','completed','failed')),
  format text NOT NULL CHECK(format IN('csv','json')), filename text NOT NULL, mime_type text NOT NULL,
  content_text text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  CONSTRAINT finance_exports_completed_content CHECK(status<>'completed' OR (content_text IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_finance_exports_report_job ON finance.exports(report_job_id,created_at DESC);
CREATE OR REPLACE FUNCTION finance.reject_completed_report_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='completed' THEN RAISE EXCEPTION 'FINANCE_COMPLETED_REPORT_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_report_jobs_immutable ON finance.report_jobs;
CREATE TRIGGER trg_finance_report_jobs_immutable BEFORE UPDATE OR DELETE ON finance.report_jobs FOR EACH ROW EXECUTE FUNCTION finance.reject_completed_report_mutation();
CREATE OR REPLACE FUNCTION finance.reject_completed_export_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='completed' THEN RAISE EXCEPTION 'FINANCE_COMPLETED_EXPORT_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_exports_immutable ON finance.exports;
CREATE TRIGGER trg_finance_exports_immutable BEFORE UPDATE OR DELETE ON finance.exports FOR EACH ROW EXECUTE FUNCTION finance.reject_completed_export_mutation();
COMMIT;
