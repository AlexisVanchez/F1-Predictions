-- =====================================================
-- F1 Predictions Database Setup
-- =====================================================
-- This script creates a new database and all required tables

-- Create the database (run this separately if needed)
CREATE DATABASE f1_predictions;

-- Connect to the new database
\c f1_predictions;

-- =====================================================
-- TABLE: users
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    global_points INTEGER DEFAULT 0,
    global_rank INTEGER,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_users_global_rank ON users(global_rank);

-- =====================================================
-- TABLE: predictions
-- =====================================================
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    race_name VARCHAR(255) NOT NULL,
    race_date DATE,
    predictions JSONB NOT NULL,
    pole_position VARCHAR(50),
    pitstops INTEGER,
    red_flags INTEGER,
    safety_car_count INTEGER,
    global_scored BOOLEAN DEFAULT FALSE,
    standard_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, race_name)
);

CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_predictions_race_name ON predictions(race_name);

-- =====================================================
-- TABLE: leagues
-- =====================================================
CREATE TABLE leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    admin_uid VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    scoring_system JSONB NOT NULL,
    standings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leagues_invite_code ON leagues(invite_code);
CREATE INDEX idx_leagues_name ON leagues(name);

-- =====================================================
-- TABLE: league_members
-- =====================================================
CREATE TABLE league_members (
    id SERIAL PRIMARY KEY,
    league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(league_id, user_id)
);

CREATE INDEX idx_league_members_league_id ON league_members(league_id);
CREATE INDEX idx_league_members_user_id ON league_members(user_id);

-- =====================================================
-- TABLE: race_results
-- =====================================================
CREATE TABLE race_results (
    id SERIAL PRIMARY KEY,
    race_name VARCHAR(255) UNIQUE NOT NULL,
    results JSONB NOT NULL,
    median_pitstops INTEGER,
    red_flags INTEGER,
    safety_car_count INTEGER,
    pole_position VARCHAR(50),
    status VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_race_results_race_name ON race_results(race_name);

-- =====================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at
    BEFORE UPDATE ON leagues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment to insert test data
/*
INSERT INTO users (uid, email, display_name, photo_url, global_points, global_rank)
VALUES 
    ('test_user_1', 'user1@example.com', 'Max Verstappen Fan', 'https://example.com/photo1.jpg', 150, 1),
    ('test_user_2', 'user2@example.com', 'Ferrari Tifosi', 'https://example.com/photo2.jpg', 120, 2);
*/
