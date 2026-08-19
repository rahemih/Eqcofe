BEGIN;

CREATE OR REPLACE FUNCTION finance.assert_account_hierarchy(p_account uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE cycle_found boolean;
BEGIN
  WITH RECURSIVE chain AS (
    SELECT a.id,a.parent_id,ARRAY[a.id]::uuid[] path,false cycle
    FROM finance.accounts a WHERE a.id=p_account
    UNION ALL
    SELECT p.id,p.parent_id,c.path||p.id,p.id=ANY(c.path)
    FROM finance.accounts p JOIN chain c ON p.id=c.parent_id
    WHERE NOT c.cycle
  )
  SELECT COALESCE(bool_or(cycle),false) INTO cycle_found FROM chain;
  IF cycle_found THEN RAISE EXCEPTION 'FINANCE_ACCOUNT_HIERARCHY_CYCLE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_account_hierarchy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_account_hierarchy(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_account_hierarchy ON finance.accounts;
CREATE CONSTRAINT TRIGGER trg_finance_account_hierarchy
AFTER INSERT OR UPDATE OF parent_id ON finance.accounts
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_account_hierarchy();

CREATE OR REPLACE FUNCTION finance.assert_journal_accounts_postable(p_entry uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM finance.journal_lines l
    JOIN finance.accounts a ON a.id=l.account_id
    WHERE l.journal_entry_id=p_entry AND (NOT a.is_active OR NOT a.is_postable)
  ) THEN RAISE EXCEPTION 'FINANCE_JOURNAL_ACCOUNT_NOT_POSTABLE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_journal_header_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('posted','reversed') THEN
    PERFORM finance.assert_journal_balanced(NEW.id);
  END IF;
  IF NEW.status='posted' THEN
    PERFORM finance.assert_journal_accounts_postable(NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION finance.prevent_posted_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry_id uuid; st text;
BEGIN
  entry_id:=CASE WHEN TG_OP='DELETE' THEN OLD.journal_entry_id ELSE NEW.journal_entry_id END;
  SELECT status INTO st FROM finance.journal_entries WHERE id=entry_id;
  IF st IN ('posted','reversed') THEN RAISE EXCEPTION 'FINANCE_POSTED_JOURNAL_IMMUTABLE'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS trg_finance_lines_prevent_posted_mutation ON finance.journal_lines;
CREATE TRIGGER trg_finance_lines_prevent_posted_mutation
BEFORE INSERT OR UPDATE OR DELETE ON finance.journal_lines
FOR EACH ROW EXECUTE FUNCTION finance.prevent_posted_journal_mutation();

CREATE OR REPLACE FUNCTION finance.prevent_posted_journal_header_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='posted' THEN
    IF NEW.status='reversed' THEN
      IF ROW(
        NEW.id,NEW.entry_number,NEW.description,NEW.occurred_at,NEW.posted_at,NEW.reversal_of_id,
        NEW.source_type,NEW.source_id,NEW.source_event_id,NEW.created_by,NEW.posted_by,NEW.created_at
      ) IS DISTINCT FROM ROW(
        OLD.id,OLD.entry_number,OLD.description,OLD.occurred_at,OLD.posted_at,OLD.reversal_of_id,
        OLD.source_type,OLD.source_id,OLD.source_event_id,OLD.created_by,OLD.posted_by,OLD.created_at
      ) THEN RAISE EXCEPTION 'FINANCE_POSTED_JOURNAL_HEADER_IMMUTABLE'; END IF;
      IF NEW.reversed_at IS NULL THEN RAISE EXCEPTION 'FINANCE_JOURNAL_REVERSED_AT_REQUIRED'; END IF;
      RETURN NEW;
    END IF;
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'FINANCE_POSTED_JOURNAL_HEADER_IMMUTABLE'; END IF;
  ELSIF OLD.status='reversed' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'FINANCE_REVERSED_JOURNAL_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_journal_header_immutable ON finance.journal_entries;
CREATE TRIGGER trg_finance_journal_header_immutable
BEFORE UPDATE ON finance.journal_entries
FOR EACH ROW EXECUTE FUNCTION finance.prevent_posted_journal_header_mutation();

CREATE OR REPLACE FUNCTION finance.assert_reversal_linkage(p_entry uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM finance.journal_entries WHERE id=p_entry;
  IF st='reversed' AND NOT EXISTS(
    SELECT 1 FROM finance.journal_entries r
    WHERE r.reversal_of_id=p_entry AND r.status='posted'
  ) THEN RAISE EXCEPTION 'FINANCE_JOURNAL_REVERSAL_LINK_REQUIRED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_reversal_linkage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_reversal_linkage(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_journal_reversal_linkage ON finance.journal_entries;
CREATE CONSTRAINT TRIGGER trg_finance_journal_reversal_linkage
AFTER INSERT OR UPDATE OF status ON finance.journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_reversal_linkage();

COMMIT;
