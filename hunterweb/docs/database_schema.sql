-- HunterWeb Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE company_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'rejected');
CREATE TYPE lead_source AS ENUM ('google_maps', 'linkedin', 'manual');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE job_type AS ENUM ('google_maps', 'linkedin', 'web_validation');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leads table (core table for opportunities)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    niche VARCHAR(100),
    location VARCHAR(255),
    company_size company_size DEFAULT 'small',
    website_url VARCHAR(500),
    has_website BOOLEAN DEFAULT FALSE,
    social_media JSONB DEFAULT '{}',
    linkedin_url VARCHAR(500),
    google_maps_url VARCHAR(500),
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    status lead_status DEFAULT 'new',
    source lead_source DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP WITH TIME ZONE
);

-- Index for deduplication and search performance
CREATE INDEX idx_leads_name ON leads USING btree (name);
CREATE INDEX idx_leads_phone ON leads USING btree (phone);
CREATE INDEX idx_leads_email ON leads USING btree (email);
CREATE INDEX idx_leads_niche ON leads USING btree (niche);
CREATE INDEX idx_leads_location ON leads USING btree (location);
CREATE INDEX idx_leads_lead_score ON leads USING btree (lead_score DESC);
CREATE INDEX idx_leads_has_website ON leads USING btree (has_website);
CREATE INDEX idx_leads_source ON leads USING btree (source);
CREATE INDEX idx_leads_status ON leads USING btree (status);
-- Composite index for common filter combinations
CREATE INDEX idx_leads_niche_location_score ON leads (niche, location, lead_score DESC);

-- Lead scores history table (audit trail for score changes)
CREATE TABLE lead_scores_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    score_factors JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_scores_history_lead_id ON lead_scores_history USING btree (lead_id);
CREATE INDEX idx_lead_scores_history_calculated_at ON lead_scores_history USING btree (calculated_at DESC);

-- Scrap jobs table (track scraping operations)
CREATE TABLE scrap_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type job_type NOT NULL,
    parameters JSONB NOT NULL,
    status job_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scrap_jobs_status ON scrap_jobs USING btree (status);
CREATE INDEX idx_scrap_jobs_job_type ON scrap_jobs USING btree (job_type);
CREATE INDEX idx_scrap_jobs_created_at ON scrap_jobs USING btree (created_at DESC);

-- Activity logs table (audit trail for user actions)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs USING btree (user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs USING btree (action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs USING btree (created_at DESC);
CREATE INDEX idx_activity_logs_resource ON activity_logs USING btree (resource_type, resource_id);

-- Alerts table (notifications for high-value leads)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_lead_id ON alerts USING btree (lead_id);
CREATE INDEX idx_alerts_is_read ON alerts USING btree (is_read);
CREATE INDEX idx_alerts_created_at ON alerts USING btree (created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create lead score history entry
CREATE OR REPLACE FUNCTION create_lead_score_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.lead_score IS DISTINCT FROM NEW.lead_score THEN
        INSERT INTO lead_scores_history (lead_id, previous_score, new_score, score_factors)
        VALUES (NEW.id, COALESCE(OLD.lead_score, 0), NEW.lead_score, '{}'::jsonb);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for lead score history
CREATE TRIGGER track_lead_score_changes AFTER UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION create_lead_score_history();

-- Insert default admin user (password: admin123)
-- Note: In production, change this password immediately!
INSERT INTO users (email, password_hash, role) VALUES 
('admin@hunterweb.com', '$2b$10$rQZ9vXJxK8N7LqPzH5qQp.vW8YqGxK7M9nR2tU3wV4xY5zA6bC7dE', 'admin');

-- Comments for documentation
COMMENT ON TABLE leads IS 'Core table storing business leads and opportunities';
COMMENT ON COLUMN leads.has_website IS 'False indicates no website found - high priority lead';
COMMENT ON COLUMN leads.lead_score IS 'Calculated score 0-100 based on opportunity criteria';
COMMENT ON COLUMN leads.social_media IS 'JSON object with social media profiles: {facebook, instagram, twitter, etc}';
COMMENT ON TABLE lead_scores_history IS 'Audit trail for lead score changes';
COMMENT ON TABLE scrap_jobs IS 'Track scraping job execution and status';
COMMENT ON TABLE activity_logs IS 'User activity audit log';
COMMENT ON TABLE alerts IS 'System notifications for high-value opportunities';
