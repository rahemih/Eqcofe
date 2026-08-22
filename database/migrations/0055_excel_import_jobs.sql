BEGIN;

CREATE SCHEMA IF NOT EXISTS excel;

CREATE TABLE excel.import_jobs (
  id uuid PRIMARY KEY,
  contract_version text NOT NULL CHECK (char_length(contract_version) BETWEEN 1 AND 80),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  requested_by uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  failure_code text NULL CHECK (failure_code IS NULL OR char_length(failure_code) BETWEEN 3 AND 120),
  failure_message text NULL CHECK (failure_message IS NULL OR char_length(failure_message) BETWEEN 1 AND 1000),
  CONSTRAINT excel_import_jobs_contract_fingerprint_uniq UNIQUE (contract_version,fingerprint),
  CONSTRAINT excel_import_jobs_state_shape_check CHECK (
    (status IN ('pending','processing') AND completed_at IS NULL AND failure_code IS NULL AND failure_message IS NULL)
    OR (status='completed' AND completed_at IS NOT NULL AND failure_code IS NULL AND failure_message IS NULL)
    OR (status='failed' AND completed_at IS NOT NULL AND failure_code IS NOT NULL AND failure_message IS NOT NULL)
  )
);

CREATE INDEX excel_import_jobs_requester_status_idx
  ON excel.import_jobs(requested_by,status,created_at,id);

COMMIT;
