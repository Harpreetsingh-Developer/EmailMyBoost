import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateSupabase } from '../middleware/auth.js';
import { encryptText, decryptText } from '../utils/encryption.js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all SMTP configurations for the current user
router.get('/', authenticateSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('smtp_configs')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Decrypt sensitive data
    const decryptedConfigs = data.map(config => ({
      ...config,
      password: config.password ? decryptText(config.password) : '',
      dkim_private_key: config.dkim_private_key ? decryptText(config.dkim_private_key) : '',
    }));

    res.json({ success: true, data: decryptedConfigs });
  } catch (error) {
    console.error('Error fetching SMTP configs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch SMTP configurations' });
  }
});

// Get a single SMTP configuration
router.get('/:id', authenticateSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('smtp_configs')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'SMTP configuration not found' });
    }

    // Decrypt sensitive data
    const decryptedConfig = {
      ...data,
      password: data.password ? decryptText(data.password) : '',
      dkim_private_key: data.dkim_private_key ? decryptText(data.dkim_private_key) : '',
    };

    res.json({ success: true, data: decryptedConfig });
  } catch (error) {
    console.error('Error fetching SMTP config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch SMTP configuration' });
  }
});

// Create a new SMTP configuration
router.post('/', authenticateSupabase, async (req, res) => {
  try {
    const {
      name,
      host,
      port,
      secure,
      username,
      password,
      from_email,
      from_name,
      is_default,
      custom_domain,
      dkim_private_key,
      dkim_selector,
      dkim_domain,
    } = req.body;

    // Validate required fields
    if (!name || !host || !port || !username || !password || !from_email) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Encrypt sensitive data
    const encryptedPassword = encryptText(password);
    const encryptedDkimKey = dkim_private_key ? encryptText(dkim_private_key) : null;

    // If this is set as default, unset any existing defaults
    if (is_default) {
      await supabase
        .from('smtp_configs')
        .update({ is_default: false })
        .eq('user_id', req.user.id);
    }

    // Insert new configuration
    const { data, error } = await supabase
      .from('smtp_configs')
      .insert([
        {
          user_id: req.user.id,
          name,
          host,
          port: parseInt(port, 10),
          secure: Boolean(secure),
          username,
          password: encryptedPassword,
          from_email,
          from_name,
          is_default: Boolean(is_default),
          custom_domain: Boolean(custom_domain),
          dkim_private_key: encryptedDkimKey,
          dkim_selector: dkim_selector || 'default',
          dkim_domain,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating SMTP config:', error);
    res.status(500).json({ success: false, error: 'Failed to create SMTP configuration' });
  }
});

// Update an existing SMTP configuration
router.put('/:id', authenticateSupabase, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      host,
      port,
      secure,
      username,
      password,
      from_email,
      from_name,
      is_default,
      custom_domain,
      dkim_private_key,
      dkim_selector,
      dkim_domain,
    } = req.body;

    // Check if config exists and belongs to user
    const { data: existingConfig, error: fetchError } = await supabase
      .from('smtp_configs')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingConfig) {
      return res.status(404).json({ success: false, error: 'SMTP configuration not found' });
    }

    // If this is set as default, unset any existing defaults
    if (is_default && !existingConfig.is_default) {
      await supabase
        .from('smtp_configs')
        .update({ is_default: false })
        .eq('user_id', req.user.id);
    }

    // Prepare update data
    const updateData = {
      name,
      host,
      port: parseInt(port, 10),
      secure: Boolean(secure),
      username,
      from_email,
      from_name,
      is_default: is_default !== undefined ? Boolean(is_default) : existingConfig.is_default,
      custom_domain: Boolean(custom_domain),
      dkim_selector: dkim_selector || 'default',
      dkim_domain,
    };

    // Only update password if provided
    if (password) {
      updateData.password = encryptText(password);
    }

    // Only update DKIM private key if provided
    if (dkim_private_key !== undefined) {
      updateData.dkim_private_key = dkim_private_key ? encryptText(dkim_private_key) : null;
    }

    // Update configuration
    const { data, error } = await supabase
      .from('smtp_configs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating SMTP config:', error);
    res.status(500).json({ success: false, error: 'Failed to update SMTP configuration' });
  }
});

// Delete an SMTP configuration
router.delete('/:id', authenticateSupabase, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if config exists and belongs to user
    const { data: existingConfig, error: fetchError } = await supabase
      .from('smtp_configs')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingConfig) {
      return res.status(404).json({ success: false, error: 'SMTP configuration not found' });
    }

    // Delete the configuration
    const { error } = await supabase
      .from('smtp_configs')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    // If this was the default config, set another one as default if available
    if (existingConfig.is_default) {
      const { data: configs } = await supabase
        .from('smtp_configs')
        .select('id')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (configs && configs.length > 0) {
        await supabase
          .from('smtp_configs')
          .update({ is_default: true })
          .eq('id', configs[0].id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting SMTP config:', error);
    res.status(500).json({ success: false, error: 'Failed to delete SMTP configuration' });
  }
});

// Set default SMTP configuration
router.patch('/:id/set-default', authenticateSupabase, async (req, res) => {
  try {
    const { id } = req.params;

    // Start a transaction
    const { data, error } = await supabase.rpc('set_default_smtp_config', {
      p_config_id: id,
      p_user_id: req.user.id,
    });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error setting default SMTP config:', error);
    res.status(500).json({ success: false, error: 'Failed to set default SMTP configuration' });
  }
});

// Test SMTP connection
router.post('/test', authenticateSupabase, async (req, res) => {
  try {
    const { host, port, secure, username, password, fromEmail, toEmail } = req.body;

    // Validate required fields
    if (!host || !port || !username || !password || !fromEmail || !toEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Create test email transporter
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: Boolean(secure),
      auth: {
        user: username,
        pass: password,
      },
    });

    // Test the connection
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP verify error:', error);
          reject(error);
        } else {
          resolve(success);
        }
      });
    });

    // Try to send a test email
    const testMessage = {
      from: `"Test Sender" <${fromEmail}>`,
      to: toEmail,
      subject: 'SMTP Test Email',
      text: 'This is a test email to verify your SMTP configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">SMTP Test Email</h1>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <p>If you're receiving this email, your SMTP settings are properly configured!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Sent from EmailMyBoost SMTP Test
          </p>
        </div>
      `,
    };

    await transporter.sendMail(testMessage);

    res.json({
      success: true,
      message: 'SMTP connection successful and test email sent!',
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({
      success: false,
      error: error.response || error.message || 'Failed to test SMTP connection',
    });
  }
});

export default router;
