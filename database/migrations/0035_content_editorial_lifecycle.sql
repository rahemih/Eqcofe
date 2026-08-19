BEGIN;

CREATE OR REPLACE FUNCTION content.guard_article_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'CONTENT_ARTICLE_OPTIMISTIC_VERSION_INVALID'; END IF;
  IF OLD.status='archived' AND NEW.status <> OLD.status THEN RAISE EXCEPTION 'CONTENT_ARTICLE_ARCHIVED_TERMINAL'; END IF;
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status='draft' AND NEW.status IN ('in_review','archived')) OR
    (OLD.status='in_review' AND NEW.status IN ('archived','approved')) OR
    (OLD.status='approved' AND NEW.status IN ('scheduled','published','archived')) OR
    (OLD.status='scheduled' AND NEW.status IN ('published','archived')) OR
    (OLD.status='published' AND NEW.status IN ('unpublished','archived')) OR
    (OLD.status='unpublished' AND NEW.status IN ('in_review','archived'))
  ) THEN RAISE EXCEPTION 'CONTENT_ARTICLE_INVALID_TRANSITION:%->%', OLD.status, NEW.status; END IF;
  IF NEW.status='scheduled' AND (NEW.scheduled_at IS NULL OR NEW.scheduled_at <= now()) THEN RAISE EXCEPTION 'CONTENT_ARTICLE_SCHEDULE_MUST_BE_FUTURE'; END IF;
  IF OLD.status='scheduled' AND NEW.status='published' AND OLD.scheduled_at > now() THEN RAISE EXCEPTION 'CONTENT_ARTICLE_SCHEDULE_NOT_DUE'; END IF;
  IF NEW.status IN ('in_review','approved','scheduled','published') AND NEW.current_version_id IS NULL THEN RAISE EXCEPTION 'CONTENT_ARTICLE_CURRENT_VERSION_REQUIRED'; END IF;
  -- Entering published must atomically designate the current editorial version as the public snapshot.
  -- While already published, current_version_id may advance as a pending edit; published_version_id remains stable until a later explicit publish transition.
  IF NEW.status='published' AND OLD.status<>'published' AND NEW.published_version_id IS DISTINCT FROM NEW.current_version_id THEN RAISE EXCEPTION 'CONTENT_ARTICLE_PUBLISH_VERSION_MISMATCH'; END IF;
  IF NEW.status='published' AND NEW.published_at IS NULL THEN RAISE EXCEPTION 'CONTENT_ARTICLE_PUBLISHED_AT_REQUIRED'; END IF;
  IF OLD.status='published' AND NEW.status='published' AND NEW.published_version_id IS DISTINCT FROM OLD.published_version_id THEN RAISE EXCEPTION 'CONTENT_ARTICLE_PUBLIC_VERSION_CHANGE_REQUIRES_PUBLISH_COMMAND'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

COMMIT;
