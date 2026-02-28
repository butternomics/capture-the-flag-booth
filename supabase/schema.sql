-- Capture the Flag ATL — Database Schema
-- Run this in your Supabase SQL Editor

-- Visitors: one row per unique email
CREATE TABLE visitors (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  first_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check-ins: one per visitor per location
CREATE TABLE checkins (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id  BIGINT NOT NULL REFERENCES visitors(id),
  location_id TEXT NOT NULL,
  format      TEXT NOT NULL DEFAULT 'portrait',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, location_id)
);

-- Indexes for common queries
CREATE INDEX idx_checkins_visitor   ON checkins (visitor_id);
CREATE INDEX idx_checkins_location  ON checkins (location_id);
CREATE INDEX idx_checkins_created   ON checkins (created_at);
CREATE INDEX idx_visitors_email     ON visitors (email);

-- Row-level security (Supabase requires this)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Allow serverless functions (service role) full access
-- The anon key should NOT have direct table access; all access goes through API functions
CREATE POLICY "Service role full access on visitors"
  ON visitors FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on checkins"
  ON checkins FOR ALL
  USING (true)
  WITH CHECK (true);
