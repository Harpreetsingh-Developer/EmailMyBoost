-- Create SMTP configurations table
CREATE TABLE IF NOT EXISTS smtp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL DEFAULT false,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT false,
    custom_domain BOOLEAN NOT NULL DEFAULT false,
    dkim_private_key TEXT,
    dkim_selector VARCHAR(50) DEFAULT 'default',
    dkim_domain VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE smtp_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own SMTP configurations"
    ON smtp_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMTP configurations"
    ON smtp_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMTP configurations"
    ON smtp_configs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMTP configurations"
    ON smtp_configs FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_smtp_configs_user_id ON smtp_configs(user_id);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smtp_configs_modtime
BEFORE UPDATE ON smtp_configs
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create a function to ensure only one default config per user
CREATE OR REPLACE FUNCTION ensure_single_default_config()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE smtp_configs
        SET is_default = false
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_config
AFTER INSERT OR UPDATE OF is_default ON smtp_configs
FOR EACH ROW
WHEN (NEW.is_default)
EXECUTE FUNCTION ensure_single_default_config();
