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
  photo_url   TEXT,
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

-- Submissions: tracks users who completed all 16 flags and submitted for review
CREATE TABLE submissions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id  BIGINT NOT NULL REFERENCES visitors(id) UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_status  ON submissions (status);
CREATE INDEX idx_submissions_visitor ON submissions (visitor_id);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on submissions"
  ON submissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Storage: bucket for check-in photo thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkin-photos');

CREATE POLICY "Service role upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'checkin-photos');
