-- EmailMyBoost Database Schema
-- This file contains the database structure for the email campaign management system

-- ==================== USER TABLES ====================

-- Users table (Supabase auth.users is the primary user table)
-- This table stores additional user profile information
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== SMTP CONFIGURATION ====================

-- User SMTP Configuration Table
-- Stores encrypted SMTP credentials for custom domain email sending
CREATE TABLE IF NOT EXISTS user_smtp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 587,
    secure BOOLEAN NOT NULL DEFAULT FALSE,
    username TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- SMTP Configuration History (for audit purposes)
CREATE TABLE IF NOT EXISTS smtp_config_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smtp_config_id UUID NOT NULL REFERENCES user_smtp_config(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'updated', 'deactivated'
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    old_values JSONB,
    new_values JSONB
);

-- ==================== EMAIL CAMPAIGNS ====================

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    template_type TEXT DEFAULT 'manual', -- 'manual', 'upload'
    status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'completed', 'failed'
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Campaign Recipients Table
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    recipient_data JSONB, -- Stores all recipient fields (name, company, etc.)
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    message_id TEXT, -- Email service message ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== BULK EMAIL JOBS ====================

-- Gmail Bulk Email Jobs Table
CREATE TABLE IF NOT EXISTS gmail_bulk_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id TEXT UNIQUE NOT NULL,
    campaign_id UUID REFERENCES email_campaigns(id),
    total_recipients INTEGER NOT NULL,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    gmail_api_error JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMTP Bulk Email Jobs Table
CREATE TABLE IF NOT EXISTS smtp_bulk_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id TEXT UNIQUE NOT NULL,
    campaign_id UUID REFERENCES email_campaigns(id),
    smtp_config_id UUID REFERENCES user_smtp_config(id),
    total_recipients INTEGER NOT NULL,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== EMAIL TEMPLATES ====================

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== ANALYTICS & TRACKING ====================

-- Email Analytics Table
CREATE TABLE IF NOT EXISTS email_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
    event_data JSONB, -- Additional event information
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================

-- Performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_smtp_config_user_id ON user_smtp_config(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmail_bulk_jobs_user_id ON gmail_bulk_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_smtp_bulk_jobs_user_id ON smtp_bulk_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_campaign_id ON email_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_timestamp ON email_analytics(timestamp);

-- ==================== TRIGGERS ====================

-- Update updated_at timestamp on record modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_smtp_config_updated_at BEFORE UPDATE ON user_smtp_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_smtp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own SMTP config" ON user_smtp_config
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own campaigns" ON email_campaigns
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own campaign recipients" ON campaign_recipients
    FOR ALL USING (campaign_id IN (
        SELECT id FROM email_campaigns WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view own bulk jobs" ON gmail_bulk_jobs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own SMTP bulk jobs" ON smtp_bulk_jobs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics" ON email_analytics
    FOR ALL USING (campaign_id IN (
        SELECT id FROM email_campaigns WHERE user_id = auth.uid()
    ));

-- ==================== COMMENTS ====================

COMMENT ON TABLE user_profiles IS 'Additional user profile information beyond Supabase auth';
COMMENT ON TABLE user_smtp_config IS 'Encrypted SMTP configuration for custom domain email sending';
COMMENT ON TABLE email_campaigns IS 'Email campaign definitions and metadata';
COMMENT ON TABLE campaign_recipients IS 'Individual recipients for each campaign';
COMMENT ON TABLE gmail_bulk_jobs IS 'Gmail API bulk email job tracking';
COMMENT ON TABLE smtp_bulk_jobs IS 'SMTP bulk email job tracking';
COMMENT ON TABLE email_templates IS 'Reusable email templates for campaigns';
COMMENT ON TABLE email_analytics IS 'Email delivery and engagement analytics';

-- ==================== SAMPLE DATA (OPTIONAL) ====================

-- Insert a sample template for new users
INSERT INTO email_templates (user_id, name, subject, content, is_default) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
    'Welcome Template',
    'Welcome to {{company_name}}!',
    '<h1>Welcome {{name}}!</h1><p>Thank you for joining {{company_name}}. We''re excited to have you on board!</p>',
    true
) ON CONFLICT DO NOTHING;
