-- F1 Predictions Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (integrates with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ,
  global_points INTEGER DEFAULT 0,
  global_rank INTEGER DEFAULT 0,
  favorite_team TEXT,
  is_mock BOOLEAN DEFAULT FALSE
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  admin_uid UUID REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  scoring_system JSONB NOT NULL DEFAULT '{"exact": [10,9,8,7,6,5,4,3,2,1], "presence": 1}'::jsonb,
  standings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_update TIMESTAMPTZ
);

-- League members (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS league_members (
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  race_name TEXT NOT NULL,
  predictions JSONB NOT NULL,
  pitstops INTEGER,
  red_flags INTEGER,
  safety_car_count INTEGER,
  date TIMESTAMPTZ DEFAULT NOW(),
  season TEXT,
  league_scores JSONB DEFAULT '{}'::jsonb,
  global_scored BOOLEAN DEFAULT FALSE,
  standard_score FLOAT,
  standard_breakdown JSONB,
  official_results JSONB,
  last_scored_at TIMESTAMPTZ,
  is_mock BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, race_name)
);

-- Races table (results cache)
CREATE TABLE IF NOT EXISTS races (
  race_name TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  pole_position TEXT,
  status TEXT,
  median_pitstops INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_global_points ON users(global_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league ON league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_race ON predictions(race_name);
CREATE INDEX IF NOT EXISTS idx_predictions_season ON predictions(season);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON leagues(invite_code);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for leagues table
CREATE POLICY "Anyone can view leagues" ON leagues
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create leagues" ON leagues
  FOR INSERT WITH CHECK (auth.uid() = admin_uid);

CREATE POLICY "Admin can update own leagues" ON leagues
  FOR UPDATE USING (auth.uid() = admin_uid);

CREATE POLICY "Admin can delete own leagues" ON leagues
  FOR DELETE USING (auth.uid() = admin_uid);

-- RLS Policies for league_members table
CREATE POLICY "Anyone can view league members" ON league_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join leagues" ON league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues" ON league_members
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for predictions table
CREATE POLICY "Users can view all predictions" ON predictions
  FOR SELECT USING (true);

CREATE POLICY "Users can create own predictions" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions" ON predictions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for races table
CREATE POLICY "Anyone can view race results" ON races
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can update races" ON races
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for system_config table
CREATE POLICY "Anyone can view system config" ON system_config
  FOR SELECT USING (true);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, photo_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'F1 Fan'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE users IS 'User profiles with global statistics';
COMMENT ON TABLE leagues IS 'User-created prediction leagues';
COMMENT ON TABLE league_members IS 'Junction table for league membership';
COMMENT ON TABLE predictions IS 'User predictions for races';
COMMENT ON TABLE races IS 'Cached official race results';
COMMENT ON TABLE system_config IS 'Global system configuration';
