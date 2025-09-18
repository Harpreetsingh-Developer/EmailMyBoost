import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { SMTPConfig } from '../types/smtp';

// Define provider types with explicit values
export const PROVIDER_TYPES = {
  GOOGLE: 'google',
  GMAIL: 'gmail',
  MICROSOFT: 'microsoft',
  SMTP: 'smtp'
} as const;

// Define provider types
type OAuthProvider = 'google' | 'microsoft' | 'gmail';
type SMTPProvider = 'smtp';

export type EmailProvider = OAuthProvider | SMTPProvider;

// Type guards
const isOAuthProvider = (provider: EmailProvider): provider is OAuthProvider => {
  return provider === 'google' || provider === 'gmail' || provider === 'microsoft';
};

const isSMTPProvider = (provider: EmailProvider): provider is SMTPProvider => {
  return provider === 'smtp';
};

// Base email parameters
interface BaseEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  provider: EmailProvider;
}

// OAuth email parameters
interface OAuthEmailParams extends BaseEmailParams {
  provider: OAuthProvider;
  accessToken?: string;
  senderEmail?: string;
}

// SMTP specific parameters
interface SMTPEmailParams extends BaseEmailParams {
  provider: SMTPProvider;
  smtpConfig: SMTPConfig;
}

// Union type for all possible email parameters
type SendEmailParams = OAuthEmailParams | SMTPEmailParams;

interface EmailStats {
  sent: number;
  total: number;
  failed: number;
  opened: number;
}

let emailStats: EmailStats = {
  sent: 0,
  total: 0,
  failed: 0,
  opened: 0
};

const subscribers: ((stats: EmailStats) => void)[] = [];

export function getEmailStats() {
  return { ...emailStats };
}

export function updateEmailStats(stats: Partial<EmailStats>) {
  emailStats = { ...emailStats, ...stats };
  subscribers.forEach(callback => callback(emailStats));
}

/**
 * Send email using the specified provider
 */
export const sendEmail = async (params: SendEmailParams) => {
  try {
    const { to, cc, bcc, subject, html, text, attachments = [] } = params;
    
    // Prepare email data
    const emailData = {
      to,
      cc,
      bcc,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback to HTML without tags
      attachments,
      messageId: `<${uuidv4()}@emailmyboost.app>`,
      date: new Date(),
    };

    // Send email based on provider
    if (isOAuthProvider(params.provider)) {
      const oauthParams = params as OAuthEmailParams;
      return sendEmailViaOAuth(
        oauthParams.provider, 
        emailData, 
        oauthParams.accessToken, 
        oauthParams.senderEmail
      );
    } else if (isSMTPProvider(params.provider)) {
      const smtpParams = params as SMTPEmailParams;
      return sendEmailViaSMTP(emailData, smtpParams.smtpConfig);
    }

    throw new Error(`Unsupported email provider: ${params.provider}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send email via SMTP server
 */
async function sendEmailViaSMTP(
  emailData: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
    messageId: string;
    date: Date;
  },
  smtpConfig: SMTPConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return new Promise((resolve, reject) => {
    try {
      // Create SMTP transporter
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
        },
        logger: process.env.NODE_ENV === 'development',
        debug: process.env.NODE_ENV === 'development',
      });

      // DKIM signing if configured
      const dkimOptions = smtpConfig.dkimPrivateKey && smtpConfig.dkimDomain ? {
        dkim: {
          domainName: smtpConfig.dkimDomain,
          keySelector: smtpConfig.dkimSelector || 'default',
          privateKey: smtpConfig.dkimPrivateKey,
        },
      } : {};

      // Send email
      transporter.sendMail(
        {
          from: smtpConfig.fromName 
            ? `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>` 
            : smtpConfig.fromEmail,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
          attachments: emailData.attachments,
          messageId: emailData.messageId,
          date: emailData.date,
          ...dkimOptions,
        },
        (error, info) => {
          if (error) {
            console.error('SMTP send error:', error);
            reject({
              success: false,
              error: error.message || 'Failed to send email via SMTP',
            });
          } else {
            console.log('SMTP message sent:', info.messageId);
            resolve({
              success: true,
              messageId: info.messageId,
            });
          }
        }
      );
    } catch (error) {
      console.error('SMTP setup error:', error);
      reject({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize SMTP transport',
      });
    }
  });
}

/**
 * Send email via OAuth provider
 */
async function sendEmailViaOAuth(
  provider: OAuthProvider,
  emailData: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
    messageId: string;
    date: Date;
  },
  accessToken?: string,
  senderEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Implement OAuth email sending logic here
  // For example, using Gmail API:
  if (provider === 'gmail') {
    const gmailApiUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages/send';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    const body = {
      'raw': encodeURI(emailData.html),
      'threadId': emailData.messageId,
    };
    const response = await fetch(gmailApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Failed to send email via Gmail API: ${response.statusText}`);
    }
    return {
      success: true,
      messageId: emailData.messageId,
    };
  }
  // Implement other OAuth providers here
  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

interface BulkEmailOptions {
  senderEmail?: string;
  smtpConfig?: SMTPConfig;
  cc?: string | string[];
  bcc?: string | string[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

interface BulkEmailResult {
  success: boolean;
  results: Array<{
    email: string;
    status: 'success' | 'error';
    message: string;
  }>;
  stats: {
    total: number;
    success: number;
    failed: number;
  };
  total: number;
  sent: number;
  failed: number;
}

/**
 * Send bulk emails using the specified provider
 */
export const sendBulkEmails = async (
  recipients: Array<{ email: string; [key: string]: string }>, 
  subject: string, 
  html: string, 
  attachments: File[] = [], 
  provider: EmailProvider = 'gmail',
  options?: BulkEmailOptions
): Promise<BulkEmailResult> => {
  emailStats = { sent: 0, total: recipients.length, failed: 0, opened: 0 };
  updateEmailStats(emailStats);
  
  const results: BulkEmailResult['results'] = [];
  
  if (provider === 'smtp' && !options?.smtpConfig) {
    throw new Error('SMTP configuration is required when using SMTP provider');
  }

  // Process emails in batches
  const batchSize = options?.batchSize || 50;
  const delayBetweenBatches = options?.delayBetweenBatches || 1000;
  
  // Process emails in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const batchPromises = batch.map(async (recipient) => {
      try {
        // Personalize the email content
        const personalizedHtml = Object.entries(recipient).reduce(
          (acc, [key, value]) => acc.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value || ''),
          html
        );
        
        const personalizedSubject = Object.entries(recipient).reduce(
          (acc, [key, value]) => acc.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value || ''),
          subject
        );
        
        // Convert File objects to nodemailer attachment format
        const emailAttachments = await Promise.all(
          attachments.map(async (file) => ({
            filename: file.name,
            content: Buffer.from(await file.arrayBuffer()),
            contentType: file.type || 'application/octet-stream',
          }))
        );
        
        // Prepare email parameters based on provider
        if (provider === 'smtp' && options?.smtpConfig) {
          // SMTP provider
          const emailParams: SMTPEmailParams = {
            to: recipient.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            text: personalizedHtml.replace(/<[^>]*>?/gm, ''), // Plain text fallback
            attachments: emailAttachments,
            provider: 'smtp',
            smtpConfig: options.smtpConfig,
          };
          await sendEmail(emailParams);
        } else {
          // OAuth provider
          const emailParams: OAuthEmailParams = {
            to: recipient.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            text: personalizedHtml.replace(/<[^>]*>?/gm, ''), // Plain text fallback
            attachments: emailAttachments,
            provider: provider as OAuthProvider,
            senderEmail: options?.senderEmail,
          };
          await sendEmail(emailParams);
        }
        
        return {
          email: recipient.email,
          status: 'success' as const,
          message: 'Email sent successfully',
        };
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        return {
          email: recipient.email,
          status: 'error' as const,
          message: error instanceof Error ? error.message : 'Failed to send email',
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Update stats
    const successCount = batchResults.filter(r => r.status === 'success').length;
    const failedCount = batchResults.length - successCount;
    
    updateEmailStats({
      sent: emailStats.sent + successCount,
      failed: emailStats.failed + failedCount,
      total: emailStats.total + batchResults.length,
    });
    
    // Add delay between batches if not the last batch
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'error').length;
  
  return {
    success: successCount > 0,
    results,
    stats: {
      total: recipients.length,
      success: successCount,
      failed: failedCount,
    },
    total: recipients.length,
    sent: successCount,
    failed: failedCount,
  };
};
