-- Reminder subscriptions for SMS training reminders
CREATE TABLE reminder_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  dog_name TEXT,
  dog_breed TEXT,
  dog_age_weeks INTEGER,
  enabled BOOLEAN DEFAULT true,
  last_sent DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for the cron job query
CREATE INDEX idx_reminder_subs_enabled ON reminder_subscriptions(enabled) WHERE enabled = true;

-- RLS
ALTER TABLE reminder_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access
-- Anon users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON reminder_subscriptions FOR SELECT
  USING (device_id = current_setting('request.jwt.claims', true)::json->>'sub');
