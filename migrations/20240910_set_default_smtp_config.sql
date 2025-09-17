-- Create or replace the function to set default SMTP config
CREATE OR REPLACE FUNCTION set_default_smtp_config(
  p_config_id UUID,
  p_user_id UUID
)
RETURNS SETOF smtp_configs AS $$
BEGIN
  -- First, unset any existing default for this user
  UPDATE smtp_configs
  SET is_default = false
  WHERE user_id = p_user_id
  AND is_default = true;
  
  -- Then set the specified config as default
  UPDATE smtp_configs
  SET is_default = true,
      updated_at = NOW()
  WHERE id = p_config_id
  AND user_id = p_user_id
  RETURNING *;
  
  -- Return the updated config
  RETURN QUERY
  SELECT * FROM smtp_configs
  WHERE id = p_config_id
  AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
