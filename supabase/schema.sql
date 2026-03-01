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

-- Venue Offers: optional partner offers shown after check-in at a location
CREATE TABLE venue_offers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id TEXT NOT NULL UNIQUE,
  offer_text  TEXT NOT NULL,
  offer_code  TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_venue_offers_location ON venue_offers(location_id);

ALTER TABLE venue_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on venue_offers"
  ON venue_offers FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- Knockout Round Support
-- ========================================

-- Game Config: single-row phase tracker
CREATE TABLE game_config (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phase      TEXT NOT NULL DEFAULT 'group_stage'
             CHECK (phase IN ('group_stage','knockout_r32','knockout_r16','semifinal')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'system'
);
INSERT INTO game_config (id, phase) VALUES (1, 'group_stage');
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on game_config"
  ON game_config FOR ALL USING (true) WITH CHECK (true);

-- Location Overrides: per-location, per-phase re-pairings
CREATE TABLE location_overrides (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id TEXT NOT NULL,
  phase       TEXT NOT NULL CHECK (phase IN ('knockout_r32','knockout_r16','semifinal')),
  country     TEXT NOT NULL,
  flag        TEXT NOT NULL,
  tagline     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (location_id, phase)
);
CREATE INDEX idx_overrides_phase ON location_overrides(phase);
ALTER TABLE location_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on location_overrides"
  ON location_overrides FOR ALL USING (true) WITH CHECK (true);

-- Alter checkins: add phase column, update unique constraint
ALTER TABLE checkins ADD COLUMN phase TEXT NOT NULL DEFAULT 'group_stage';
ALTER TABLE checkins DROP CONSTRAINT checkins_visitor_id_location_id_key;
ALTER TABLE checkins ADD CONSTRAINT checkins_visitor_location_phase_key
  UNIQUE (visitor_id, location_id, phase);
CREATE INDEX idx_checkins_phase ON checkins(phase);
