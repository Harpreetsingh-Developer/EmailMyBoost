import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { SMTPConfigForm } from './SMTPConfigForm';
import { SMTPConfig } from '../types/smtp';

interface SMTPSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: SMTPConfig) => void;
}

export function SMTPSettings({ 
  isOpen, 
  onClose, 
  onConfigSaved
}: SMTPSettingsProps) {
  const [config, setConfig] = useState<SMTPConfig>({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
    customDomain: false,
    dkimPrivateKey: "",
    dkimSelector: "default",
    dkimDomain: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load saved configuration on component mount
  useEffect(() => {
    const loadConfig = () => {
      const saved = localStorage.getItem('smtp_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
        } catch (error) {
          console.error('Failed to parse saved SMTP config:', error);
        }
      }
    };

    loadConfig();
  }, []);

  const handleSave = async (config: SMTPConfig): Promise<{ success: boolean; message: string }> => {
    setIsSaving(true);
    try {
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

      // Prepare the configuration object
      const smtpConfig = {
        ...config,
        // Convert port to number if it's a string
        port: typeof config.port === 'string' ? parseInt(config.port, 10) : config.port,
        // Don't send empty DKIM fields if not using custom domain
        ...(config.customDomain ? {
          dkimPrivateKey: config.dkimPrivateKey,
          dkimSelector: config.dkimSelector || 'default',
          dkimDomain: config.dkimDomain
        } : {
          dkimPrivateKey: '',
          dkimSelector: '',
          dkimDomain: ''
        })
      };

      // Send to backend for encryption and storage
      const response = await fetch('/api/smtp/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(smtpConfig)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save SMTP configuration');
      }
      
      // Update local state with the saved config (which includes encrypted fields)
      const savedConfig = result.data || result;
      
      // Save to localStorage
      localStorage.setItem('email_provider', 'smtp');
      localStorage.setItem('smtp_config', JSON.stringify(savedConfig));
      
      // Notify parent component
      onConfigSaved(savedConfig);
      
      return { 
        success: true, 
        message: 'SMTP configuration saved successfully!',
      };
    } catch (error) {
      console.error('Failed to save SMTP config:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { 
        success: false, 
        message: `Failed to save configuration: ${errorMessage}` 
      };
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (config: SMTPConfig): Promise<{ success: boolean; message: string }> => {
    setIsTesting(true);
    try {
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

      // Prepare test configuration
      const testConfig = {
        ...config,
        port: typeof config.port === 'string' ? parseInt(config.port, 10) : config.port,
        // Only include DKIM fields if custom domain is enabled and private key is provided
        ...(config.customDomain && config.dkimPrivateKey ? {
          dkimPrivateKey: config.dkimPrivateKey,
          dkimSelector: config.dkimSelector || 'default',
          dkimDomain: config.dkimDomain
        } : {})
      };

      // Send test request to backend
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(testConfig)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Test connection failed');
      }
      
      return {
        success: result.success,
        message: result.message || (result.success 
          ? `Test email sent successfully! ${result.dkimUsed ? '(With DKIM)' : ''}`
          : 'Test failed')
      };
    } catch (error) {
      console.error('Failed to test SMTP connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return {
        success: false,
        message: `Test failed: ${errorMessage}`
      };
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              <Settings className="inline-block mr-2 h-6 w-6" />
              Email Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <SMTPConfigForm
              initialConfig={config}
              onSave={handleSave}
              onTest={handleTest}
              onClose={onClose}
              isSaving={isSaving}
              isTesting={isTesting}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                You can clear the saved SMTP config and switch back to Gmail.
              </div>
              <button
                type="button"
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                onClick={() => {
                  try {
                    localStorage.removeItem('smtp_config');
                    localStorage.setItem('email_provider', 'gmail');
                  } catch (e) {}
                  onClose();
                  // Refresh UI to reflect provider change immediately
                  window.location.reload();
                }}
              >
                Clear SMTP & switch to Gmail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
