BEGIN;

CREATE TABLE IF NOT EXISTS notifications.after_sales_notifications (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  event_type varchar(100) NOT NULL,
  aggregate_type varchar(40) NOT NULL,
  aggregate_id uuid NOT NULL,
  title_fa varchar(200) NOT NULL,
  message_fa text NOT NULL CHECK(length(message_fa) BETWEEN 1 AND 2000),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_after_sales_notifications_customer_created
  ON notifications.after_sales_notifications(customer_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_after_sales_notifications_customer_unread
  ON notifications.after_sales_notifications(customer_id,created_at DESC,id)
  WHERE read_at IS NULL;

COMMIT;
