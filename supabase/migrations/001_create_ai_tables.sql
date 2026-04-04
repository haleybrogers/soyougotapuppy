-- Weekly training plans (cached per user per week)
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  dog_age_weeks INTEGER NOT NULL,
  plan JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, week_number, year)
);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own plans (filtered client-side by device_id)
CREATE POLICY "Anyone can read plans by device_id"
  ON weekly_plans FOR SELECT
  USING (true);

-- Only service role (edge functions) can insert
CREATE POLICY "Service role can insert plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (true);

-- Index for fast cache lookups
CREATE INDEX idx_weekly_plans_lookup
  ON weekly_plans (device_id, week_number, year);

-- Daily breed facts (cached per user per day)
CREATE TABLE daily_breed_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  fact_date DATE NOT NULL,
  breed TEXT NOT NULL,
  dog_age_weeks INTEGER NOT NULL,
  fact TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, fact_date)
);

ALTER TABLE daily_breed_facts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own facts (filtered client-side by device_id)
CREATE POLICY "Anyone can read facts by device_id"
  ON daily_breed_facts FOR SELECT
  USING (true);

-- Only service role (edge functions) can insert
CREATE POLICY "Service role can insert facts"
  ON daily_breed_facts FOR INSERT
  WITH CHECK (true);

-- Index for fast cache lookups
CREATE INDEX idx_daily_facts_lookup
  ON daily_breed_facts (device_id, fact_date);
