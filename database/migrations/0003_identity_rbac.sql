CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS iam.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_normalized varchar(20),
  email_normalized varchar(320),
  password_hash text,
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','locked','disabled','anonymized')),
  mobile_verified_at timestamptz,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_account_identity CHECK (mobile_normalized IS NOT NULL OR email_normalized IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_mobile ON iam.accounts (mobile_normalized) WHERE mobile_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_email_ci ON iam.accounts (lower(email_normalized)) WHERE email_normalized IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid UNIQUE REFERENCES iam.accounts(id) ON DELETE SET NULL,
  customer_type varchar(20) NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail','wholesale')),
  first_name varchar(100), last_name varchar(100), mobile_normalized varchar(20), email_normalized varchar(320),
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','anonymized')),
  registered_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version>0)
);

CREATE TABLE IF NOT EXISTS iam.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  actor_type varchar(20) NOT NULL CHECK (actor_type IN ('customer','staff')),
  token_hash char(64) NOT NULL UNIQUE,
  device_id varchar(200),
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sessions_account_active ON iam.sessions(account_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS iam.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_hash char(64) NOT NULL,
  destination_encrypted text NOT NULL,
  purpose varchar(30) NOT NULL,
  code_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts smallint NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_otp_destination_purpose ON iam.otp_challenges(destination_hash, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS iam.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  webauthn_user_id text,
  credential_device_type varchar(32),
  backed_up boolean NOT NULL DEFAULT false,
  sign_count bigint NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
  device_name varchar(150) NOT NULL,
  transports jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_webauthn_account ON iam.webauthn_credentials(account_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS iam.auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES iam.accounts(id) ON DELETE CASCADE,
  challenge_type varchar(30) NOT NULL CHECK (challenge_type IN ('admin_pre_auth','webauthn_auth','webauthn_register','step_up')),
  challenge text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_auth_challenge_active ON iam.auth_challenges(account_id, challenge_type, expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS admin.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  employee_code varchar(50),
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  fido_enrollment_token_hash char(64),
  fido_enrollment_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_employee_code ON admin.staff_profiles(employee_code) WHERE employee_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(100) NOT NULL UNIQUE,
  name_fa varchar(150) NOT NULL,
  description_fa text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(160) NOT NULL UNIQUE,
  module varchar(80) NOT NULL,
  name_fa varchar(150) NOT NULL,
  description_fa text,
  risk_level varchar(20) NOT NULL DEFAULT 'normal' CHECK (risk_level IN ('low','normal','high','critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin.role_permissions (
  role_id uuid NOT NULL REFERENCES admin.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES admin.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin.staff_roles (
  staff_id uuid NOT NULL REFERENCES admin.staff_profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY(staff_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin.access_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES admin.staff_profiles(id) ON DELETE CASCADE,
  scope_type varchar(40) NOT NULL,
  scope_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, scope_type, scope_id)
);

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('staff.view','admin','مشاهده کارکنان','normal'),
 ('staff.manage','admin','مدیریت کارکنان','high'),
 ('rbac.view','admin','مشاهده نقش‌ها و دسترسی‌ها','normal'),
 ('rbac.manage','admin','مدیریت نقش‌ها و دسترسی‌ها','critical'),
 ('security.sessions.manage','security','مدیریت نشست‌ها','high'),
 ('security.fido.recover','security','بازیابی کلید فیزیکی مدیر','critical')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS iam.auth_attempts (
  id bigserial PRIMARY KEY,
  attempt_type varchar(30) NOT NULL CHECK (attempt_type IN ('otp_request','admin_login')),
  subject_hash char(64) NOT NULL,
  source_ip inet,
  success boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_auth_attempts_subject_time ON iam.auth_attempts(attempt_type,subject_hash,occurred_at DESC);
