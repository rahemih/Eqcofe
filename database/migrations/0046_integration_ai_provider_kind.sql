ALTER TABLE integrations.provider_configurations
  DROP CONSTRAINT IF EXISTS provider_configurations_provider_kind_check;

ALTER TABLE integrations.provider_configurations
  ADD CONSTRAINT provider_configurations_provider_kind_check
  CHECK (provider_kind IN ('fx','sms','email','shipping','payment_aux','ai'));
