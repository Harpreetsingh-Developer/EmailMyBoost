import express from 'express';
import nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';
import { promisify } from 'util';
import crypto from 'crypto';
import { createHash, randomBytes } from 'crypto';
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SMTP_ENCRYPTION_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(`Missing SMTP environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Using default encryption key for development. Set SMTP_ENCRYPTION_KEY in production.');
}

const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY || 'default-dev-key-change-in-production-32-chars';
const SALT_ROUNDS = parseInt(process.env.SMTP_SALT_ROUNDS) || 10;

// Initialize Supabase for authentication
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://gtmndgwkahpkkcgsgext.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY
);

// Supabase Authentication middleware
async function authenticateSupabase(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: "Access token required" 
    });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token",
        details: error?.message,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Supabase auth error:", error);
    return res.status(403).json({
      success: false,
      error: "Authentication failed",
      details: error.message,
    });
  }
}

// Helper function to generate a secure key from password
async function generateKey(password, salt) {
  const key = await promisify(crypto.pbkdf2)(
    password,
    salt,
    100000, // iterations
    32,     // key length
    'sha512'
  );
  return key.toString('hex');
}

// Helper function to encrypt sensitive data
function encryptText(text) {
  try {
    if (!text) return '';
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Return IV + encrypted data
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

// Helper function to decrypt sensitive data
function decryptText(encryptedText) {
  try {
    if (!encryptedText) return '';
    // Split the IV and encrypted data
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) return '';
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

// Helper function to create transporter with optional DKIM
async function createTransporter(config) {
  // Decrypt sensitive data before creating transporter
  const decryptedConfig = {
    ...config,
    password: decryptText(config.password),
    ...(config.dkimPrivateKey && { 
      dkimPrivateKey: decryptText(config.dkimPrivateKey) 
    })
  };

  const {
    host,
    port,
    secure,
    username,
    password,
    customDomain = false,
    dkimPrivateKey,
    dkimSelector = 'default',
    dkimDomain
  } = decryptedConfig;

  // Normalize types
  const normalizedPort = typeof port === 'string' ? parseInt(port, 10) : Number(port);
  const normalizedSecure = typeof secure === 'string' ? secure === 'true' : !!secure;

  const transporter = nodemailer.createTransport({
    host,
    port: normalizedPort,
    secure: normalizedSecure,
    auth: {
      user: username,
      pass: password
    },
    // Prefer IPv4 to avoid some providers' IPv6 issues
    family: 4,
    // For STARTTLS on 587 ensure TLS is required
    requireTLS: !normalizedSecure && normalizedPort === 587,
    connectionTimeout: 20000,
    // Server banner can be slow with some providers; allow more time
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      // Allow self-signed/old certs in dev; tighten in prod if needed
      rejectUnauthorized: false,
      servername: host
    },
    // Helpful diagnostics in dev
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
    // Create a test email with DKIM signing if configured
    dkim: customDomain && dkimPrivateKey && dkimDomain ? {
      domainName: dkimDomain,
      keySelector: dkimSelector,
      privateKey: dkimPrivateKey,
      cache: true,
      headersToSign: [
        'from',
        'to',
        'subject',
        'message-id',
        'date',
        'mime-version',
        'content-type'
      ]
    } : undefined
  });

  return transporter;
}

// Helper function to normalize SMTP configuration
function normalizeSmtpConfig(config) {
  // If config is a string, parse it as JSON
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (e) {
      throw new Error('Invalid SMTP configuration format');
    }
  }

  // Handle both direct properties and nested smtpConfig object
  const smtpConfig = config.smtpConfig || config;
  
  // Extract and validate required fields
  const {
    host,
    port,
    secure,
    username,
    password,
    fromEmail = username, // Default fromEmail to username if not provided
    fromName,
    customDomain = false,
    dkimPrivateKey,
    dkimSelector = 'default',
    dkimDomain
  } = smtpConfig;

  // Validate required fields
  if (!host || !port || !username || !password || !fromEmail) {
    throw new Error('Missing required SMTP configuration: host, port, username, password, and fromEmail are required');
  }

  // Normalize types correctly
  const normalizedPort = typeof port === 'string' ? parseInt(port, 10) : Number(port);
  const normalizedSecure = typeof secure === 'string' ? secure === 'true' : !!secure;

  // Encrypt sensitive values for storage/transport
  const encryptedPassword = encryptText(password);
  const encryptedDkim = dkimPrivateKey ? encryptText(dkimPrivateKey) : undefined;

  return {
    host,
    port: normalizedPort,
    secure: normalizedSecure,
    username,
    password: encryptedPassword,
    fromEmail,
    fromName,
    customDomain,
    dkimPrivateKey: encryptedDkim,
    dkimSelector,
    dkimDomain
  };
}

// SMTP Configuration Management Routes

// Get all SMTP configurations for authenticated user
router.get('/config', authenticateSupabase, async (req, res) => {
  try {
    const user = req.user;
    
    // For now, we'll store configs in localStorage on frontend
    // In production, you'd want to store these in a database
    res.json({
      success: true,
      data: [],
      message: 'SMTP configurations retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Failed to get SMTP configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve SMTP configurations',
      details: error.message
    });
  }
});

// Create new SMTP configuration
router.post('/config', authenticateSupabase, async (req, res) => {
  try {
    const user = req.user;
    const config = req.body;
    
    // Validate required fields
    if (!config.host || !config.port || !config.username || !config.password || !config.fromEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: host, port, username, password, fromEmail'
      });
    }
    
    // Normalize and encrypt the configuration
    const normalizedConfig = normalizeSmtpConfig(config);
    
    // In production, save to database with user association
    // For now, return the encrypted config
    res.json({
      success: true,
      data: {
        id: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        ...normalizedConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: 'SMTP configuration saved successfully'
    });
  } catch (error) {
    console.error('❌ Failed to save SMTP config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save SMTP configuration',
      details: error.message
    });
  }
});

// Update SMTP configuration
router.put('/config/:id', authenticateSupabase, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const config = req.body;
    
    // Validate required fields
    if (!config.host || !config.port || !config.username || !config.fromEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: host, port, username, fromEmail'
      });
    }
    
    // Normalize and encrypt the configuration
    const normalizedConfig = normalizeSmtpConfig(config);
    
    // In production, update in database with user association
    res.json({
      success: true,
      data: {
        id,
        userId: user.id,
        ...normalizedConfig,
        updatedAt: new Date().toISOString()
      },
      message: 'SMTP configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Failed to update SMTP config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update SMTP configuration',
      details: error.message
    });
  }
});

// Delete SMTP configuration
router.delete('/config/:id', authenticateSupabase, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    // In production, delete from database with user association
    res.json({
      success: true,
      message: 'SMTP configuration deleted successfully'
    });
  } catch (error) {
    console.error('❌ Failed to delete SMTP config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete SMTP configuration',
      details: error.message
    });
  }
});

// Test SMTP connection
router.post('/test', authenticateSupabase, async (req, res) => {
  try {
    // Normalize the SMTP configuration
    const config = normalizeSmtpConfig(req.body);
    
    // Destructure the normalized config
    const { 
      host, 
      port, 
      secure, 
      username, 
      password, 
      fromEmail, 
      fromName,
      customDomain,
      dkimPrivateKey,
      dkimSelector,
      dkimDomain
    } = config;
    
    // Configuration is already validated in normalizeSmtpConfig

    // Create a transporter with the provided configuration
    const transporter = await createTransporter({
      host,
      port,
      secure,
      username,
      password,
      customDomain,
      dkimPrivateKey,
      dkimSelector,
      dkimDomain
    });

    // Verify connection configuration
    await transporter.verify();
    
    // Prepare email options
    const emailOptions = {
      from: `"${fromName || 'EmailMyBoost Test'}" <${fromEmail}>`,
      to: username, // Send to self as test
      subject: `SMTP Configuration Test - ${customDomain ? 'Custom Domain' : 'Standard'} - EmailMyBoost`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">✅ SMTP Configuration Test</h1>
          <p>Your SMTP configuration is working correctly!</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Details:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Host:</strong> ${host}</li>
              <li><strong>Port:</strong> ${port}</li>
              <li><strong>Secure:</strong> ${secure ? 'Yes (TLS/SSL)' : 'No (Not Recommended)'}</li>
              <li><strong>Authentication:</strong> ${username ? 'Enabled' : 'Disabled'}</li>
              <li><strong>From Email:</strong> ${fromEmail}</li>
              <li><strong>From Name:</strong> ${fromName || 'Not set'}</li>
              ${customDomain ? `
              <li><strong>Custom Domain:</strong> Enabled</li>
              <li><strong>DKIM Domain:</strong> ${dkimDomain || 'Not configured'}</li>
              <li><strong>DKIM Selector:</strong> ${dkimSelector}</li>
              <li><strong>DKIM Status:</strong> ${dkimPrivateKey ? 'Configured' : 'Not configured'}</li>
              ` : ''}
            </ul>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This test email was sent at ${new Date().toLocaleString()}
            ${customDomain ? '<br>With DKIM signing' : ''}
          </p>
        </div>
      `,
      // Add message ID with domain for better tracking
      messageId: `<${Date.now()}@${customDomain && dkimDomain ? dkimDomain : 'emailmyboost.app'}>`
    };

    // Send test email
    const testResult = await transporter.sendMail(emailOptions);
    console.log('✅ SMTP test email sent successfully:', testResult.messageId);

    // Check if DKIM was used
    const dkimUsed = customDomain && dkimPrivateKey && dkimDomain;
    
    res.json({ 
      success: true, 
      message: `Test email sent successfully!${dkimUsed ? ' (With DKIM)' : ''}`,
      messageId: testResult.messageId,
      dkimUsed,
      dkimDetails: dkimUsed ? {
        domain: dkimDomain,
        selector: dkimSelector,
        // Don't expose the private key in the response
        keyFingerprint: dkimPrivateKey ? 
          createHash('sha256').update(dkimPrivateKey).digest('hex').substring(0, 16) : null
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SMTP test failed:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Test failed. Please check your configuration.';
    let errorDetails = error.message || error.toString();
    let errorCode = error.code || 'UNKNOWN_ERROR';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password.';
      errorCode = 'AUTH_FAILED';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to the SMTP server. Please check your host and port.';
      errorCode = 'CONNECTION_FAILED';
    } else if (error.message && error.message.includes('DKIM')) {
      errorMessage = 'DKIM signing failed. Please check your DKIM configuration.';
      errorCode = 'DKIM_ERROR';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your host and port settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Please check your network and firewall settings.';
    }

    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: errorDetails,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
  }
});

// Send single email via SMTP
router.post('/send-email', authenticateSupabase, async (req, res) => {
  try {
    const user = req.user;
    const { smtpConfig, to, subject, html, cc, bcc } = req.body;
    
    // Validate required fields
    if (!smtpConfig || !to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: smtpConfig, to, subject, html'
      });
    }
    
    // Normalize SMTP configuration
    const normalizedConfig = normalizeSmtpConfig(smtpConfig);
    
    // Create transporter
    const transporter = await createTransporter(normalizedConfig);
    
    // Build recipient data for placeholder replacement
    const recipientData = typeof to === 'string' 
      ? { email: to }
      : (to && typeof to === 'object') ? { email: to.email || '', ...to } : { email: '' };

    // Basic email styles to improve rendering across clients
    const emailStyles = `
      <style>
        .email-content p { margin: 16px 0; line-height: 1.6; color: #374151; }
        .email-content h1, .email-content h2, .email-content h3, .email-content h4, .email-content h5, .email-content h6 { margin: 24px 0 16px 0; font-weight: 600; line-height: 1.3; color: #1f2937; }
        .email-content a { color: #2563eb; text-decoration: underline; }
        .email-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; display: block; }
        .email-content table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .email-content th, .email-content td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
      </style>`;

    // Apply placeholder replacement, convert bare URLs to <img>, add footer, then embed images
    const processedSubject = replacePlaceholders(subject, recipientData);
    const contentWithPlaceholders = replacePlaceholders(html, recipientData);
    let contentWithImgs = convertBareImageUrlsToImg(contentWithPlaceholders);
    contentWithImgs = await convertUrlsToImagesByContentType(contentWithImgs);
    // const footer = `<div style="margin-top:24px; color:#9ca3af; font-size:12px;">Sent with EmailMyBoost</div>`;
    const processedHtmlRaw = `${emailStyles}<div class="email-content">${contentWithImgs}</div>`;
    const { html: processedHtml, attachments } = embedImagesInHtml(processedHtmlRaw);

    // Send email
    const emailOptions = {
      from: normalizedConfig.fromName 
        ? `"${normalizedConfig.fromName}" <${normalizedConfig.fromEmail}>` 
        : normalizedConfig.fromEmail,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: processedSubject,
      html: processedHtml,
      messageId: `<${Date.now()}@${normalizedConfig.customDomain && normalizedConfig.dkimDomain ? normalizedConfig.dkimDomain : 'emailmyboost.app'}>`,
      attachments: attachments.length ? attachments : undefined
    };
    
    const result = await transporter.sendMail(emailOptions);
    
    console.log('✅ SMTP email sent successfully:', result.messageId);
    
    res.json({
      success: true,
      message: 'Email sent successfully via SMTP',
      messageId: result.messageId,
      from: normalizedConfig.fromEmail,
      to: to,
      subject: subject
    });
    
  } catch (error) {
    console.error('❌ SMTP email sending failed:', error);
    
    let errorMessage = 'Failed to send email via SMTP';
    let errorCode = 'SEND_FAILED';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your SMTP credentials.';
      errorCode = 'AUTH_FAILED';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to the SMTP server. Please check your host and port.';
      errorCode = 'CONNECTION_FAILED';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: error.toString()
    });
  }
});

// Send bulk email via SMTP
router.post('/send-bulk', authenticateSupabase, async (req, res) => {
  let jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Initialize progress tracking
  if (!global.smtpProgressTracking) {
    global.smtpProgressTracking = new Map();
  }
  
  try {
    // Normalize SMTP configuration if provided
    let smtpConfig = req.body.smtpConfig 
      ? normalizeSmtpConfig(req.body.smtpConfig)
      : null;

    const { 
      recipients, 
      subject, 
      content, 
      cc = '', 
      bcc = '',
      customDomain = false,
      dkimPrivateKey,
      dkimSelector = 'default',
      dkimDomain
    } = req.body;
    
    // Validate required fields
    if (!recipients || !subject || !content) {
      // If using custom SMTP, we need the SMTP config
      if (!smtpConfig && req.body.provider === 'smtp') {
        return res.status(400).json({
          success: false,
          message: 'SMTP configuration is required when using custom SMTP provider'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipients, subject, content, smtpConfig',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate recipients format
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    if (recipientList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient is required',
        code: 'NO_RECIPIENTS'
      });
    }

    // Debug: Log recipients format
    console.log('Recipients received:', JSON.stringify(recipientList, null, 2));

    // Decrypt sensitive data
    const decryptedConfig = {
      ...smtpConfig,
      password: smtpConfig.password ? decryptText(smtpConfig.password) : ''
    };

    // Create transporter with DKIM support if configured
    const transporter = await createTransporter({
      ...decryptedConfig,
      customDomain,
      dkimPrivateKey,
      dkimSelector,
      dkimDomain
    });

    // Track progress
    const totalRecipients = recipientList.length;
    let processed = 0;
    const results = {
      success: 0,
      failed: 0,
      errors: {}
    };

    // Initialize progress tracking for this job
    global.smtpProgressTracking.set(jobId, {
      total: totalRecipients,
      sent: 0,
      failed: 0,
      status: 'running',
      current: null,
      errors: {}
    });

    // Process emails in chunks to avoid overwhelming the server
    const chunkSize = smtpConfig?.chunkSize || 10; // Allow custom chunk size, default to 10
    const chunks = [];
    for (let i = 0; i < recipientList.length; i += chunkSize) {
      chunks.push(recipientList.slice(i, i + chunkSize));
    }

    // Process email chunks in parallel with limited concurrency
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const promises = chunk.map(async recipient => {
        // Extract email address from recipient object
        const recipientEmail = typeof recipient === 'string' ? recipient : recipient.email;
        
        // Debug: Log recipient processing
        console.log('Processing recipient:', recipient, 'Extracted email:', recipientEmail);
        
        // Use the fromEmail from SMTP config if available, otherwise use the one from request
        const senderEmail = smtpConfig?.fromEmail || req.body.fromEmail || smtpConfig?.username;
        const senderName = smtpConfig?.fromName || req.body.fromName || '';
        
        const recipientData = typeof recipient === 'string' 
          ? { email: recipient }
          : { ...recipient, email: recipientEmail };

        // Basic email styles to improve rendering across clients
        const emailStyles = `
          <style>
            .email-content p { margin: 16px 0; line-height: 1.6; color: #374151; }
            .email-content h1, .email-content h2, .email-content h3, .email-content h4, .email-content h5, .email-content h6 { margin: 24px 0 16px 0; font-weight: 600; line-height: 1.3; color: #1f2937; }
            .email-content a { color: #2563eb; text-decoration: underline; }
            .email-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; display: block; }
            .email-content table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .email-content th, .email-content td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          </style>`;

        const processedSubject = replacePlaceholders(subject, recipientData);
        const contentWithPlaceholders = replacePlaceholders(content, recipientData);
        let contentWithImgs = convertBareImageUrlsToImg(contentWithPlaceholders);
        contentWithImgs = await convertUrlsToImagesByContentType(contentWithImgs);
        const footer = `<div style="margin-top:24px; color:#9ca3af; font-size:12px;">Sent with EmailMyBoost</div>`;
        const processedHtmlRaw = `${emailStyles}<div class="email-content">${contentWithImgs}${footer}</div>`;
        const { html: processedHtml, attachments } = embedImagesInHtml(processedHtmlRaw);

        const email = {
          from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
          to: recipientEmail,
          subject: processedSubject,
          html: processedHtml,
          attachments: attachments.length ? attachments : undefined,
          dkim: (smtpConfig?.customDomain || customDomain) && 
                smtpConfig?.dkimPrivateKey && 
                smtpConfig?.dkimDomain ? {
            domainName: smtpConfig.dkimDomain || dkimDomain,
            keySelector: smtpConfig.dkimSelector || dkimSelector || 'default',
            privateKey: smtpConfig.dkimPrivateKey || dkimPrivateKey,
            cache: true,
            headersToSign: [
              'from',
              'to',
              'subject',
              'message-id',
              'date',
              'mime-version',
              'content-type'
            ]
          } : undefined
        };
        try {
          const info = await transporter.sendMail(email);
          results.success++;
          const progress = global.smtpProgressTracking.get(jobId);
          if (progress) {
            progress.sent++;
            progress.current = recipientEmail;
            global.smtpProgressTracking.set(jobId, progress);
          }
          return { success: true, email: recipientEmail, messageId: info.messageId };
        } catch (error) {
          results.failed++;
          const progress = global.smtpProgressTracking.get(jobId);
          if (progress) {
            progress.failed++;
            progress.current = recipientEmail;
            progress.errors[recipientEmail] = error.message || 'Unknown error';
            global.smtpProgressTracking.set(jobId, progress);
          }
          return {
            success: false,
            email: recipientEmail,
            error: error.message || 'Unknown error',
            code: error.code,
            smtpResponse: error.response
          };
        }
      });

      // Send each chunk with a small delay between them
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update final progress status
    const progress = global.smtpProgressTracking.get(jobId);
    if (progress) {
      progress.status = results.failed === 0 ? 'completed' : 'completed_with_errors';
      progress.current = null;
      global.smtpProgressTracking.set(jobId, progress);
    }

    // Prepare response
    const response = {
      success: results.success > 0,
      message: results.failed === 0 
        ? 'All emails sent successfully!' 
        : `Emails sent with some failures (${results.success} success, ${results.failed} failed)`,
      jobId,
      total: totalRecipients,
      ...results,
      dkimUsed: customDomain && dkimPrivateKey && dkimDomain,
      dkimDetails: customDomain && dkimPrivateKey && dkimDomain ? {
        domain: dkimDomain,
        selector: dkimSelector,
        keyFingerprint: createHash('sha256').update(dkimPrivateKey).digest('hex').substring(0, 16)
      } : null
    };

    if (results.failed > 0) {
      response.errorSummary = `${results.failed} emails failed to send. First error: ${Object.values(results.errors)[0]?.message || 'Unknown error'}`;
    }

    res.json(response);

  } catch (error) {
    console.error('Bulk email sending failed:', error);
    
    // Update progress status to failed
    const progress = global.smtpProgressTracking.get(jobId);
    if (progress) {
      progress.status = 'failed';
      progress.error = error.message || 'Unknown error';
      global.smtpProgressTracking.set(jobId, progress);
    }
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to send bulk emails';
    let errorCode = 'SEND_FAILED';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your SMTP credentials.';
      errorCode = 'AUTH_FAILED';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to the SMTP server. Please check your host and port.';
      errorCode = 'CONNECTION_FAILED';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      code: errorCode,
      jobId,
      error: error.toString(),
      timestamp: new Date().toISOString()
    });
  }
});

// Get SMTP bulk email progress
router.get('/progress/:jobId', authenticateSupabase, (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get progress from global tracking (you might want to use a database instead)
    const progress = global.smtpProgressTracking?.get(jobId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      progress: {
        jobId: jobId,
        total: progress.total,
        sent: progress.sent,
        failed: progress.failed,
        current: progress.current,
        status: progress.status,
        startTime: progress.startTime,
        error: progress.error,
        results: progress.results || []
      }
    });

  } catch (error) {
    console.error('Failed to get SMTP progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get progress',
      error: error.message 
    });
  }
});

// Initialize global progress tracking
if (!global.smtpProgressTracking) {
  global.smtpProgressTracking = new Map();
}

// Helper function to replace placeholders in text
function replacePlaceholders(text, data) {
  if (!text || !data) return text;

  let result = text;

  // Replace {{placeholder}} patterns
  const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g;
  result = result.replace(placeholderRegex, (match, key) => {
    const trimmedKey = key.trim();

    // Try exact match first
    if (data[trimmedKey] !== undefined) {
      return data[trimmedKey];
    }

    // Try case-insensitive search
    const matchingKey = Object.keys(data).find(
      (dataKey) => dataKey.toLowerCase() === trimmedKey.toLowerCase()
    );

    if (matchingKey && data[matchingKey] !== undefined) {
      return data[matchingKey];
    }

    // If no match found, return the original placeholder
    return match;
  });

  return result;
}

// Helper to embed remote images as attachments and rewrite HTML to use cid:
function embedImagesInHtml(html) {
  if (!html) {
    return { html, attachments: [] };
  }

  const imgRegex = /<img\b[^>]*?src=["']([^"']+)["'][^>]*?>/gi;
  const attachments = [];
  let index = 0;
  let processedHtml = html;

  processedHtml = processedHtml.replace(imgRegex, (match, src) => {
    // Only embed http(s) images; skip data:, cid:, and inline SVG
    if (!/^https?:\/\//i.test(src)) {
      return match;
    }
    const cid = `img_${Date.now()}_${index++}@emailmyboost`;
    attachments.push({
      filename: src.split('/').pop() || `image_${index}.png`,
      path: src,
      cid
    });
    return match.replace(src, `cid:${cid}`);
  });

  return { html: processedHtml, attachments };
}

// Convert bare image URLs to <img> tags and normalize some hosts (e.g., Gyazo)
function convertBareImageUrlsToImg(html) {
  if (!html) return html;

  // Convert Gyazo page URLs to direct image URLs
  const normalizeUrl = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('gyazo.com') && !u.hostname.startsWith('i.')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://i.gyazo.com/${id}.png`;
      }
      return url;
    } catch (_) {
      return url;
    }
  };

  // Replace bare image URLs in text with <img> tags
  // Matches http(s) URLs ending with common image extensions
  // Convert <a href="imgUrl">imgUrl</a> to <img>
  const anchorImgRegex = /<a\b[^>]*?href=["'](https?:\/\/[^"'>]+\.(?:png|jpg|jpeg|gif|webp|svg|avif|bmp|ico|tif|tiff|jfif|pjpeg|pjp|apng)(?:\?[^"'>]*)?)["'][^>]*>\s*\1\s*<\/a>/gi;
  html = html.replace(anchorImgRegex, (_m, href) => {
    const normalized = normalizeUrl(href);
    return `<img src="${normalized}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`;
  });

  const imageUrlRegex = /(?:^|\s)(?:Image\s*)?["']?(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg|avif|bmp|ico|tif|tiff|jfif|pjpeg|pjp|apng))(\?[^\s"'<>]*)?["']?/gi;
  return html.replace(imageUrlRegex, (_match, url) => {
    const normalized = normalizeUrl(url);
    return `<img src="${normalized}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`;
  });
}

// HEAD-check generic URLs and convert those that are images into <img>
async function convertUrlsToImagesByContentType(html) {
  if (!html) return html;
  const genericUrlRegex = /[\s\(\[@]?\b(https?:\/\/[^\s"'<>\)]+)/g;
  const urls = Array.from(new Set((html.match(genericUrlRegex) || [])));
  let result = html;
  for (const url of urls) {
    // Skip if already used as <img src="...">
    if (result.includes(`src="${url}`) || result.includes(`src='${url}`)) continue;
    try {
      // Normalize gyazo to direct image
      const nu = (() => {
        try {
          const u = new URL(url);
          if (u.hostname.includes('gyazo.com') && !u.hostname.startsWith('i.')) {
            const id = u.pathname.split('/').filter(Boolean)[0];
            if (id) return `https://i.gyazo.com/${id}.png`;
          }
          return url;
        } catch (_) {
          return url;
        }
      })();
      let ct = '';
      try {
        const head = await fetch(nu, { method: 'HEAD' });
        ct = head.headers.get('content-type') || '';
      } catch (_) {}
      if (!ct || !ct.startsWith('image/')) {
        try {
          const getRes = await fetch(nu, { method: 'GET' });
          ct = getRes.headers.get('content-type') || '';
        } catch (_) {}
      }
      if (ct.startsWith('image/')) {
        const safeUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const urlRegex = new RegExp(safeUrl, 'g');
        result = result.replace(
          urlRegex,
          `<img src="${nu}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`
        );
      }
    } catch (e) {
      // ignore
    }
  }
  return result;
}

export default router;
