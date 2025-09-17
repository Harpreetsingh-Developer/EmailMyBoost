import { useState } from 'react';
import { TestTube, Save, AlertCircle, CheckCircle } from 'lucide-react';

import { SMTPConfig } from '../types/smtp';

interface SMTPConfigFormProps {
  initialConfig: SMTPConfig;
  onSave: (config: SMTPConfig) => Promise<{ success: boolean; message: string }>;
  onTest: (config: SMTPConfig) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
  isSaving: boolean;
  isTesting: boolean;
}

export function SMTPConfigForm({
  initialConfig,
  onSave,
  onTest,
  onClose,
  isSaving,
  isTesting
}: SMTPConfigFormProps) {
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
    dkimDomain: "",
    ...initialConfig
  });
  // Password visibility toggle state
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateSMTPConfig = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    if (!config.host) errors.host = 'SMTP host is required';
    if (!config.port) errors.port = 'Port is required';
    if (!config.username) errors.username = 'Username is required';
    if (!config.password) errors.password = 'Password is required';
    if (!config.fromEmail) errors.fromEmail = 'From email is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.fromEmail && !emailRegex.test(config.fromEmail)) {
      errors.fromEmail = 'Please enter a valid email address';
    }
    
    if (config.customDomain && !config.dkimDomain) {
      errors.dkimDomain = 'DKIM domain is required for custom domain';
    }
    
    setFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseInt(value) || 0 
          : value
    }));
    
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Helper function to generate consistent input props
  const getInputProps = (name: keyof SMTPConfig, type = 'text') => ({
    name,
    type: name === 'password' && !showPassword ? 'password' : type,
    value: String(config[name] ?? ''),
    checked: type === 'checkbox' ? Boolean(config[name]) : undefined,
    onChange: handleInputChange,
    className: `w-full px-3 py-2 border ${
      formErrors[name] 
        ? 'border-red-500 focus:ring-red-500' 
        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
    } rounded-md focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white`,
  });
  
  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword(prev => !prev);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid } = validateSMTPConfig();
    if (!isValid) return;
    
    const result = await onSave(config);
    setTestResult(result);
    if (result.success) setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    const { isValid } = validateSMTPConfig();
    if (!isValid) return;
    
    const result = await onTest(config);
    setTestResult(result);
  };

  return (
    <div className="space-y-6">
      {testResult && (
        <div className={`p-4 rounded-lg border ${
          testResult.success 
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' 
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* SMTP Server */}
          <div className="sm:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">SMTP Server</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input
                  {...getInputProps('host')}
                  id="host"
                  placeholder="smtp.example.com"
                />
                {formErrors.host && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.host}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Port <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...getInputProps('port', 'number')}
                    id="port"
                    placeholder="587"
                  />
                  {formErrors.port && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.port}</p>
                  )}
                </div>
                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={config.secure}
                      onChange={(e) => setConfig(prev => ({ ...prev, secure: e.target.checked }))}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use SSL/TLS</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="sm:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Authentication</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  {...getInputProps('username')}
                  id="username"
                  placeholder="your-username"
                />
                {formErrors.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.username}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...getInputProps('password')}
                    id="password"
                    placeholder="Your SMTP password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" x2="22" y1="2" y2="22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sender Information */}
          <div className="sm:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sender Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Name
                </label>
                <input
                  {...getInputProps('fromName')}
                  id="fromName"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...getInputProps('fromEmail', 'email')}
                  id="fromEmail"
                  placeholder="your-email@example.com"
                />
                {formErrors.fromEmail && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.fromEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* DKIM Configuration */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">DKIM Configuration</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={config.customDomain}
                  onChange={(e) => setConfig(prev => ({ ...prev, customDomain: e.target.checked }))}
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Custom Domain</span>
              </label>
            </div>

            {config.customDomain && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="dkimDomain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    DKIM Domain <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...getInputProps('dkimDomain')}
                    id="dkimDomain"
                    placeholder="example.com"
                  />
                  {formErrors.dkimDomain && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.dkimDomain}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="dkimSelector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    DKIM Selector
                  </label>
                  <input
                    {...getInputProps('dkimSelector')}
                    id="dkimSelector"
                    placeholder="default"
                  />
                </div>

                <div>
                  <label htmlFor="dkimPrivateKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    DKIM Private Key
                  </label>
                  <textarea
                    {...getInputProps('dkimPrivateKey')}
                    id="dkimPrivateKey"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 flex items-center"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SMTPConfigForm;
