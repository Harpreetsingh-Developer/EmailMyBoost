import { Client } from '@microsoft/microsoft-graph-client';

interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: any[];
  sender?: {
    email: string;
    name: string;
  };
}

export const sendEmailViaMicrosoft = async (accessToken: string, emailData: EmailData) => {
  try {
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    // Parse CC and BCC emails
    const ccRecipients = emailData.cc 
      ? emailData.cc.split(',').map(email => ({ emailAddress: { address: email.trim() } }))
      : [];
    
    const bccRecipients = emailData.bcc 
      ? emailData.bcc.split(',').map(email => ({ emailAddress: { address: email.trim() } }))
      : [];

    const message = {
      subject: emailData.subject,
      body: {
        contentType: 'HTML',
        content: emailData.html
      },
      toRecipients: [{
        emailAddress: {
          address: emailData.to
        }
      }],
      ccRecipients: ccRecipients,
      bccRecipients: bccRecipients,
      from: emailData.sender ? {
        emailAddress: {
          address: emailData.sender.email,
          name: emailData.sender.name
        }
      } : undefined
    };

    // Add attachments if present
    if (emailData.attachments && emailData.attachments.length > 0) {
      (message as any).attachments = emailData.attachments.map((attachment: any) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType || 'application/octet-stream',
        contentBytes: attachment.content
      }));
    }

    const response = await graphClient.api('/me/sendMail').post({
      message: message
    });

    return {
      success: true,
      messageId: response?.id || 'unknown',
      response: response
    };

  } catch (error) {
    console.error('Microsoft Graph API error:', error);
    throw new Error(`Failed to send email via Microsoft: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
