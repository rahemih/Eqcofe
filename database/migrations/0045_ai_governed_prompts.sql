CREATE TABLE IF NOT EXISTS ai.prompt_definitions (
  id uuid PRIMARY KEY,
  prompt_key varchar(80) NOT NULL UNIQUE CHECK (prompt_key ~ '^[a-z][a-z0-9-]{2,79}$'),
  operation varchar(30) NOT NULL CHECK (operation IN ('product_qa','draft_content')),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','disabled')),
  active_version integer NULL CHECK (active_version IS NULL OR active_version > 0),
  created_by uuid NULL REFERENCES iam.accounts(id),
  updated_by uuid NULL REFERENCES iam.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS ai.prompt_versions (
  id uuid PRIMARY KEY,
  prompt_id uuid NOT NULL REFERENCES ai.prompt_definitions(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  template text NOT NULL CHECK (length(btrim(template)) BETWEEN 1 AND 20000),
  created_by uuid NULL REFERENCES iam.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prompt_id, version_number)
);

ALTER TABLE ai.prompt_definitions
  DROP CONSTRAINT IF EXISTS fk_ai_prompt_active_version;
ALTER TABLE ai.prompt_definitions
  ADD CONSTRAINT fk_ai_prompt_active_version
  FOREIGN KEY (id, active_version)
  REFERENCES ai.prompt_versions(prompt_id, version_number)
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS ix_ai_prompt_versions_latest
  ON ai.prompt_versions(prompt_id, version_number DESC);
CREATE INDEX IF NOT EXISTS ix_ai_prompt_active_operation
  ON ai.prompt_definitions(operation, prompt_key)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION ai.guard_prompt_version_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AI_PROMPT_VERSION_IMMUTABLE';
END $$;

DROP TRIGGER IF EXISTS trg_ai_prompt_version_immutable ON ai.prompt_versions;
CREATE TRIGGER trg_ai_prompt_version_immutable
BEFORE UPDATE OR DELETE ON ai.prompt_versions
FOR EACH ROW EXECUTE FUNCTION ai.guard_prompt_version_immutable();
