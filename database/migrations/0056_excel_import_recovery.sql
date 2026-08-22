BEGIN;

CREATE TABLE excel.import_job_attempts (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES excel.import_jobs(id) ON DELETE RESTRICT,
  attempt_no integer NOT NULL CHECK (attempt_no BETWEEN 1 AND 3),
  worker_token uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('processing','completed','failed','abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  failure_code text NULL CHECK (failure_code IS NULL OR char_length(failure_code) BETWEEN 3 AND 120),
  failure_message text NULL CHECK (failure_message IS NULL OR char_length(failure_message) BETWEEN 1 AND 1000),
  recovery_note text NULL CHECK (recovery_note IS NULL OR char_length(recovery_note) BETWEEN 1 AND 500),
  CONSTRAINT excel_import_job_attempts_job_no_uniq UNIQUE (job_id,attempt_no),
  CONSTRAINT excel_import_job_attempts_state_shape_check CHECK (
    (status='processing' AND ended_at IS NULL AND failure_code IS NULL AND failure_message IS NULL)
    OR (status='completed' AND ended_at IS NOT NULL AND failure_code IS NULL AND failure_message IS NULL)
    OR (status='failed' AND ended_at IS NOT NULL AND failure_code IS NOT NULL AND failure_message IS NOT NULL)
    OR (status='abandoned' AND ended_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX excel_import_job_attempts_one_processing_idx
  ON excel.import_job_attempts(job_id) WHERE status='processing';

CREATE INDEX excel_import_job_attempts_history_idx
  ON excel.import_job_attempts(job_id,attempt_no DESC);

COMMIT;
