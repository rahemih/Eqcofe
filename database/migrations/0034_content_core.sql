BEGIN;

CREATE TABLE IF NOT EXISTS content.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(180) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','scheduled','published','unpublished','archived')),
  current_version_id uuid NULL,
  published_version_id uuid NULL,
  scheduled_at timestamptz NULL,
  published_at timestamptz NULL,
  first_published_at timestamptz NULL,
  archived_at timestamptz NULL,
  archive_reason varchar(1000) NULL,
  created_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  approved_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  published_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  archived_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT content_article_slug_shape CHECK (
    length(slug) BETWEEN 1 AND 180 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT content_article_schedule_shape CHECK (
    (status='scheduled' AND scheduled_at IS NOT NULL)
    OR (status<>'scheduled' AND scheduled_at IS NULL)
  ),
  CONSTRAINT content_article_public_shape CHECK (
    (status='published' AND published_version_id IS NOT NULL AND published_at IS NOT NULL)
    OR status<>'published'
  ),
  CONSTRAINT content_article_archive_shape CHECK (
    (status='archived' AND archived_at IS NOT NULL AND archive_reason IS NOT NULL AND length(archive_reason) BETWEEN 2 AND 1000)
    OR (status<>'archived' AND archived_at IS NULL AND archive_reason IS NULL)
  ),
  CONSTRAINT content_article_approval_shape CHECK (
    (status IN ('approved','scheduled','published') AND approved_at IS NOT NULL)
    OR status NOT IN ('approved','scheduled','published')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_articles_slug
  ON content.articles(slug);
CREATE INDEX IF NOT EXISTS ix_content_articles_status_updated
  ON content.articles(status, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS ix_content_articles_public
  ON content.articles(published_at DESC, id)
  WHERE status='published';
CREATE INDEX IF NOT EXISTS ix_content_articles_scheduled_due
  ON content.articles(scheduled_at, id)
  WHERE status='scheduled';

CREATE TABLE IF NOT EXISTS content.article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES content.articles(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  title_fa varchar(300) NOT NULL CHECK (length(btrim(title_fa)) BETWEEN 1 AND 300),
  slug varchar(180) NOT NULL,
  body text NULL CHECK (body IS NULL OR length(body) BETWEEN 1 AND 100000),
  seo_title varchar(300) NULL CHECK (seo_title IS NULL OR length(btrim(seo_title)) BETWEEN 1 AND 300),
  meta_description varchar(500) NULL CHECK (meta_description IS NULL OR length(btrim(meta_description)) BETWEEN 1 AND 500),
  restored_from_version integer NULL CHECK (restored_from_version IS NULL OR restored_from_version > 0),
  created_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_article_version_slug_shape CHECK (
    length(slug) BETWEEN 1 AND 180 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  UNIQUE(article_id, version_number)
);
CREATE INDEX IF NOT EXISTS ix_content_article_versions_article
  ON content.article_versions(article_id, version_number DESC, id);

ALTER TABLE content.articles
  DROP CONSTRAINT IF EXISTS fk_content_article_current_version;
ALTER TABLE content.articles
  ADD CONSTRAINT fk_content_article_current_version
  FOREIGN KEY (current_version_id) REFERENCES content.article_versions(id) ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE content.articles
  DROP CONSTRAINT IF EXISTS fk_content_article_published_version;
ALTER TABLE content.articles
  ADD CONSTRAINT fk_content_article_published_version
  FOREIGN KEY (published_version_id) REFERENCES content.article_versions(id) ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS content.article_transition_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES content.articles(id) ON DELETE RESTRICT,
  from_status varchar(20) NULL CHECK (from_status IS NULL OR from_status IN ('draft','in_review','approved','scheduled','published','unpublished','archived')),
  to_status varchar(20) NOT NULL CHECK (to_status IN ('draft','in_review','approved','scheduled','published','unpublished','archived')),
  article_version_id uuid NULL REFERENCES content.article_versions(id) ON DELETE RESTRICT,
  actor_staff_id uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  reason varchar(2000) NULL CHECK (reason IS NULL OR length(reason) <= 2000),
  scheduled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_content_article_transition_history
  ON content.article_transition_history(article_id, created_at DESC, id);

CREATE OR REPLACE FUNCTION content.guard_article_version_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CONTENT_ARTICLE_VERSION_IMMUTABLE';
END $$;
DROP TRIGGER IF EXISTS trg_content_article_version_immutable ON content.article_versions;
CREATE TRIGGER trg_content_article_version_immutable
BEFORE UPDATE OR DELETE ON content.article_versions
FOR EACH ROW EXECUTE FUNCTION content.guard_article_version_immutable();

CREATE OR REPLACE FUNCTION content.assert_article_version_ownership()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_article_id uuid;
BEGIN
  IF NEW.current_version_id IS NOT NULL THEN
    SELECT article_id INTO v_article_id FROM content.article_versions WHERE id=NEW.current_version_id;
    IF v_article_id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'CONTENT_CURRENT_VERSION_OWNERSHIP_MISMATCH';
    END IF;
  END IF;
  IF NEW.published_version_id IS NOT NULL THEN
    SELECT article_id INTO v_article_id FROM content.article_versions WHERE id=NEW.published_version_id;
    IF v_article_id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'CONTENT_PUBLISHED_VERSION_OWNERSHIP_MISMATCH';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_content_article_version_ownership ON content.articles;
CREATE CONSTRAINT TRIGGER trg_content_article_version_ownership
AFTER INSERT OR UPDATE OF current_version_id,published_version_id ON content.articles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION content.assert_article_version_ownership();

CREATE OR REPLACE FUNCTION content.guard_article_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_OPTIMISTIC_VERSION_INVALID';
  END IF;

  IF OLD.status='archived' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_ARCHIVED_TERMINAL';
  END IF;

  IF NEW.status <> OLD.status AND NOT (
    (OLD.status='draft' AND NEW.status IN ('in_review','archived')) OR
    (OLD.status='in_review' AND NEW.status IN ('archived','approved')) OR
    (OLD.status='approved' AND NEW.status IN ('scheduled','published','archived')) OR
    (OLD.status='scheduled' AND NEW.status IN ('published','archived')) OR
    (OLD.status='published' AND NEW.status IN ('unpublished','archived')) OR
    (OLD.status='unpublished' AND NEW.status IN ('in_review','archived'))
  ) THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_INVALID_TRANSITION:%->%', OLD.status, NEW.status;
  END IF;

  IF NEW.status='scheduled' AND (NEW.scheduled_at IS NULL OR NEW.scheduled_at <= now()) THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_SCHEDULE_MUST_BE_FUTURE';
  END IF;

  IF OLD.status='scheduled' AND NEW.status='published' AND OLD.scheduled_at > now() THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_SCHEDULE_NOT_DUE';
  END IF;

  IF NEW.status IN ('in_review','approved','scheduled','published') AND NEW.current_version_id IS NULL THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_CURRENT_VERSION_REQUIRED';
  END IF;

  IF NEW.status='published' AND NEW.published_version_id IS DISTINCT FROM NEW.current_version_id THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_PUBLISH_VERSION_MISMATCH';
  END IF;

  IF NEW.status='published' AND NEW.published_at IS NULL THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_PUBLISHED_AT_REQUIRED';
  END IF;

  IF OLD.status='published' AND NEW.status='published' AND NEW.published_version_id IS DISTINCT FROM OLD.published_version_id THEN
    RAISE EXCEPTION 'CONTENT_ARTICLE_PUBLIC_VERSION_CHANGE_REQUIRES_PUBLISH_COMMAND';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_content_article_transition ON content.articles;
CREATE TRIGGER trg_content_article_transition
BEFORE UPDATE ON content.articles
FOR EACH ROW EXECUTE FUNCTION content.guard_article_transition();

CREATE OR REPLACE FUNCTION content.guard_transition_history_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CONTENT_TRANSITION_HISTORY_IMMUTABLE';
END $$;
DROP TRIGGER IF EXISTS trg_content_transition_history_immutable ON content.article_transition_history;
CREATE TRIGGER trg_content_transition_history_immutable
BEFORE UPDATE OR DELETE ON content.article_transition_history
FOR EACH ROW EXECUTE FUNCTION content.guard_transition_history_immutable();

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
('content.view','content','مشاهده محتوای مدیریتی','normal'),
('content.edit','content','ایجاد و ویرایش مقاله','high'),
('content.review','content','بررسی و تأیید مقاله','high'),
('content.publish','content','زمان‌بندی و انتشار یا لغو انتشار مقاله','critical'),
('content.archive_restore','content','آرشیو و بازیابی نسخه مقاله','critical')
ON CONFLICT(key) DO NOTHING;

COMMIT;
