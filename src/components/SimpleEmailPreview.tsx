import { useState } from 'react';
import { X, Loader, User, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { replacePlaceholders } from '../utils/fileProcessing';

// Professional email styles that will be applied to email content
const emailStyles = `
  <style>
    .email-content p {
      margin: 16px 0;
      line-height: 1.6;
      color: #374151;
    }
    .email-content h1, .email-content h2, .email-content h3, .email-content h4, .email-content h5, .email-content h6 {
      margin: 24px 0 16px 0;
      font-weight: 600;
      line-height: 1.3;
      color: #1f2937;
    }
    .email-content h1 { font-size: 28px; }
    .email-content h2 { font-size: 24px; }
    .email-content h3 { font-size: 20px; }
    .email-content h4 { font-size: 18px; }
    .email-content h5 { font-size: 16px; }
    .email-content h6 { font-size: 14px; }
    .email-content a {
      color: #2563eb;
      text-decoration: underline;
      transition: color 0.2s;
    }
    .email-content a:hover {
      color: #1d4ed8;
    }
    .email-content strong, .email-content b {
      font-weight: 600;
      color: #1f2937;
    }
    .email-content em, .email-content i {
      font-style: italic;
    }
    .email-content ul, .email-content ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    .email-content li {
      margin: 8px 0;
      line-height: 1.6;
    }
    .email-content blockquote {
      margin: 20px 0;
      padding: 16px 20px;
      border-left: 4px solid #e5e7eb;
      background-color: #f9fafb;
      font-style: italic;
      color: #6b7280;
    }
    .email-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
      display: block;
    }
    .email-content hr {
      margin: 32px 0;
      border: none;
      border-top: 1px solid #e5e7eb;
    }
    .email-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .email-content th, .email-content td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .email-content th {
      font-weight: 600;
      background-color: #f9fafb;
      color: #1f2937;
    }
    .email-content code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      color: #dc2626;
    }
    .email-content pre {
      background-color: #f3f4f6;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .email-content pre code {
      background: none;
      padding: 0;
      color: #374151;
    }
  </style>
`;

interface SimpleEmailPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Array<{ [key: string]: string }>;
  subject: string;
  content: string;
  ccEmails?: string;
  bccEmails?: string;
  attachments: File[];
  user: SupabaseUser | null;
  smtpConfig?: any;
  emailProvider?: 'gmail' | 'smtp';
}

export function SimpleEmailPreview({ 
  isOpen, 
  onClose, 
  recipients, 
  subject, 
  content, 
  ccEmails = '', 
  bccEmails = '', 
  attachments, 
  user,
  smtpConfig,
  emailProvider = 'gmail'
}: SimpleEmailPreviewProps) {
  const { sendBulkEmails: sendBulkEmailsViaAuth } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendingProgress, setSendingProgress] = useState<{sent: number, total: number, current?: string}>({
    sent: 0,
    total: 0,
    current: ''
  });

  const getRecipientEmail = (recipient: { [key: string]: string }) => {
    const emailFields = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'emailAddress', 'email_address'];
    
    for (const field of emailFields) {
      if (recipient[field] && recipient[field].includes('@')) {
        return recipient[field].trim();
      }
    }
    
    for (const value of Object.values(recipient)) {
      if (typeof value === 'string' && value.includes('@')) {
        return value.trim();
      }
    }
    
    return 'No email found';
  };

  const sendBulkEmails = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    setSendingProgress({ sent: 0, total: recipients.length, current: '' });

    try {
      // Prepare recipients data
      const recipientsData = recipients.map(recipient => ({
        ...recipient,
        email: getRecipientEmail(recipient)
      }));

      let result;

      if (emailProvider === 'smtp' && smtpConfig) {
        // Get Supabase session for authentication
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('User not authenticated');
        }

        // Send via SMTP
        const response = await fetch('/api/smtp/send-bulk', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            recipients: recipientsData,
            subject: subject,
            content: content,
            cc: ccEmails,
            bcc: bccEmails,
            smtpConfig: smtpConfig
          })
        });

        if (!response.ok) {
          throw new Error('Failed to start SMTP bulk email job');
        }

        const smtpResult = await response.json();
        
        // Start progress tracking for SMTP
        const jobId = smtpResult.jobId;
        const progressInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`/api/smtp/progress/${jobId}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              const progress = progressData.progress;
              
              setSendingProgress({
                sent: progress.sent,
                total: progress.total,
                current: progress.current
              });

              if (progress.status === 'completed' || progress.status === 'failed') {
                clearInterval(progressInterval);
                if (progress.status === 'completed') {
                  setSuccess(`✅ All emails sent successfully via SMTP! ${progress.sent} sent, ${progress.failed} failed.`);
                } else {
                  setError(`❌ SMTP bulk email job failed: ${progress.error}`);
                }
                setSending(false);
              }
            }
          } catch (error) {
            console.error('Failed to get SMTP progress:', error);
          }
        }, 2000);

        result = smtpResult;

      } else {
        // Use the auth hook's sendBulkEmails function with progress tracking (Gmail)
        result = await sendBulkEmailsViaAuth({
          recipients: recipientsData,
          subject: subject,
          content: content,
          cc: ccEmails,
          bcc: bccEmails
        }, (progress) => {
          // Update progress in real-time
          setSendingProgress({
            sent: progress.sent,
            total: progress.total,
            current: progress.current
          });
        }) as any;
      }

      if (emailProvider !== 'smtp') {
        setSuccess(`✅ All emails sent successfully! ${result.summary.sent} sent, ${result.summary.failed} failed.`);
        setSendingProgress({ sent: result.summary.sent, total: result.summary.total, current: '' });
      }

    } catch (err: any) {
      console.error('Bulk email error:', err);
      setError(err.message || 'Failed to send emails');
    } finally {
      if (emailProvider !== 'smtp') {
        setSending(false);
      }
    }
  };

  if (!isOpen) return null;

  // Use first recipient for preview placeholder replacement
  const previewRecipientBase = recipients.length > 0 ? recipients[0] : {};
  const previewRecipientWithEmail = {
    ...previewRecipientBase,
    email: getRecipientEmail(previewRecipientBase as any)
  } as { [key: string]: string };
  const processedSubject = replacePlaceholders(subject, previewRecipientWithEmail);
  const processedContent = replacePlaceholders(content, previewRecipientWithEmail);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-blue-50 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Sending from: {emailProvider === 'smtp' ? smtpConfig?.fromEmail : user?.email}
              </p>
              <p className="text-xs text-blue-700">
                {emailProvider === 'smtp' ? (
                  <>
                    Provider: Custom SMTP ({smtpConfig?.host}) • 
                    Using custom domain
                  </>
                ) : (
                  <>
                    Provider: {user?.app_metadata?.provider || 'email'} • 
                    Authenticated with Supabase
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Email Content Preview - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Email Template Preview */}
          <div className="border rounded-lg overflow-hidden">
            {/* Email Header */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">From:</span>
                  <span className="ml-2">{emailProvider === 'smtp' ? smtpConfig?.fromEmail : user?.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">To:</span>
                  <span className="ml-2">{recipients.length} recipients</span>
                </div>
                {ccEmails && (
                  <div>
                    <span className="font-medium text-gray-700">CC:</span>
                    <span className="ml-2">{replacePlaceholders(ccEmails, previewRecipientWithEmail)}</span>
                  </div>
                )}
                {bccEmails && (
                  <div>
                    <span className="font-medium text-gray-700">BCC:</span>
                    <span className="ml-2">{replacePlaceholders(bccEmails, previewRecipientWithEmail)}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Subject:</span>
                  <span className="ml-2 font-medium">{processedSubject}</span>
                </div>
                {attachments.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Attachments:</span>
                    <span className="ml-2">{attachments.map(f => f.name).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Email Body */}
            <div className="p-6 bg-white">
              <div className="prose max-w-none">
                <div 
                  className="text-gray-900"
                  dangerouslySetInnerHTML={{ __html: `${emailStyles}<div class="email-content">${processedContent}</div>` }}
                  style={{
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recipients List */}
          <div className="mt-6 border rounded-lg">
            <div className="bg-gray-50 p-4 border-b">
              <h3 className="font-medium text-gray-900">Recipients ({recipients.length})</h3>
            </div>
            <div className="p-4 max-h-40 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {recipients.slice(0, 10).map((recipient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {index + 1}
                    </div>
                    <span>{getRecipientEmail(recipient)}</span>
                  </div>
                ))}
                {recipients.length > 10 && (
                  <div className="col-span-2 text-gray-500 text-center py-2">
                    ... and {recipients.length - 10} more recipients
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Placeholder Info */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">📝 Template Preview</h4>
            <p className="text-sm text-yellow-700">
              This preview shows how the email will look with data from the first recipient. 
              Placeholders like <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, etc. will be replaced with each recipient's actual data when sent.
            </p>
            {recipients.length > 0 && (
              <p className="text-xs text-yellow-600 mt-1">
                Preview using data from: {getRecipientEmail(recipients[0])}
              </p>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-red-50 border-t">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border-t">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm">{success}</p>
            </div>
          </div>
        )}

        {sending && (
          <div className="p-4 bg-blue-50 border-t">
            <div className="flex items-center space-x-3">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="flex justify-between text-sm text-blue-800 mb-1">
                  <span>Sending emails...</span>
                  <span>{sendingProgress.sent}/{sendingProgress.total}</span>
                </div>
                {sendingProgress.current && (
                  <div className="text-xs text-blue-700 mb-2">
                    Current: {sendingProgress.current}
                  </div>
                )}
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: sendingProgress.total > 0 ? `${(sendingProgress.sent / sendingProgress.total) * 100}%` : '0%' }}
                  />
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {sendingProgress.total > 0 ? Math.round((sendingProgress.sent / sendingProgress.total) * 100) : 0}% complete
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t flex-shrink-0">
          <div className="text-sm text-gray-600">
            Ready to send to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            
            <button
              onClick={sendBulkEmails}
              disabled={sending || recipients.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              <span>Send All Emails</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}