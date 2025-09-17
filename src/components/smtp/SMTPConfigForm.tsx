import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SMTPConfig, SMTPConfigFormData } from '../../types/smtp';
import { smtpService } from '../../services/smtpService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { Card } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Textarea } from '../ui/Textarea';
import { 
  Save, 
  TestTube2, 
  Server, 
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

// Create a function to generate the schema with proper typing
const createSmtpSchema = (isEditMode: boolean) => {
  const baseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    host: z.string().min(1, 'Host is required'),
    port: z.number().min(1).max(65535, 'Port must be between 1 and 65535'),
    secure: z.boolean().default(false),
    username: z.string().min(1, 'Username is required'),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    fromEmail: z.string().email('Invalid email address'),
    fromName: z.string().optional(),
    isDefault: z.boolean().default(false),
    customDomain: z.boolean().default(false),
    dkimPrivateKey: z.string().optional(),
    dkimSelector: z.string().default('default'),
    dkimDomain: z.string().optional(),
  });

  // Add password validation only for new configurations
  if (!isEditMode) {
    return baseSchema
      .refine((data) => !!data.password && data.password.length > 0, {
        message: 'Password is required',
        path: ['password'],
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
  }
  
  // For edit mode, only validate password if it's provided
  return baseSchema.refine(
    (data) => !data.password || data.password === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  );
};

type SMTPConfigFormProps = {
  initialData?: SMTPConfig;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function SMTPConfigForm({ initialData, onSuccess, onCancel }: SMTPConfigFormProps) {
  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(!showConfirmPassword);
  }, [showConfirmPassword]);

  // Simple toast implementation
  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' = 'success') => {
    // This is a simple implementation. In a real app, you might want to use a proper toast library
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    // You could also implement a custom toast component here
  }, []);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Generate the appropriate schema based on whether we're in edit mode
  const smtpSchema = createSmtpSchema(!!initialData?.id);
  
  const { 
    register, 
    formState: { errors }, 
    watch, 
    setValue,
    trigger,
    getValues
  } = useForm<SMTPConfigFormData>({
    resolver: zodResolver(smtpSchema) as any, // Type assertion needed due to Zod's type complexity
    defaultValues: {
      name: initialData?.name || '',
      host: initialData?.host || '',
      port: initialData?.port || 587,
      secure: initialData?.secure || false,
      username: initialData?.username || '',
      password: '',
      confirmPassword: '',
      fromEmail: initialData?.fromEmail || '',
      fromName: initialData?.fromName || '',
      isDefault: initialData?.isDefault || false,
      customDomain: initialData?.customDomain || false,
      dkimSelector: initialData?.dkimSelector || 'default',
      dkimDomain: initialData?.dkimDomain || '',
      dkimPrivateKey: initialData?.dkimPrivateKey || ''
    }
  });

  const customDomain = watch('customDomain');
  const secure = watch('secure');

  const onSubmit = async (data: SMTPConfigFormData) => {
    try {
      setIsSubmitting(true);
      
      // Prepare config data
      const { confirmPassword, ...config } = data;
      
      // If it's an update and password is empty, remove it from the update
      if (initialData?.id && (!config.password || config.password === '')) {
        const { password, ...rest } = config;
        Object.assign(config, rest);
      }
      
      if (initialData?.id) {
        await smtpService.updateConfig(initialData.id, config);
        showToast(
          'Success', 
          'SMTP configuration updated successfully', 
          'success'
        );
      } else {
        await smtpService.createConfig(config);
        showToast(
          'Success',
          'SMTP configuration created successfully',
          'success'
        );
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving SMTP configuration:', error);
      showToast(
        'Error', 
        error instanceof Error ? error.message : 'Failed to save SMTP configuration', 
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      
      // Validate required fields
      const isValid = await trigger(['host', 'port', 'username', 'password', 'fromEmail']);
      if (!isValid) {
        showToast('Error', 'Please fill in all required fields', 'error');
        return;
      }

      const data = {
        host: watch('host'),
        port: watch('port'),
        secure: watch('secure'),
        username: watch('username'),
        password: watch('password'),
        fromEmail: watch('fromEmail'),
        toEmail: watch('fromEmail'), // Test email to self
      };

      const result = await smtpService.testConnection(data);
      
      showToast(
        result.success ? 'Success' : 'Error',
        result.message,
        result.success ? 'success' : 'error'
      );
    } catch (error) {
      console.error('Error testing SMTP connection:', error);
      showToast(
        'Error', 
        error instanceof Error ? error.message : 'Failed to test SMTP connection', 
        'error'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const formRef = useRef<HTMLFormElement>(null);
  const fromEmail = watch('fromEmail');

  // Handle form submission with proper typing
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await trigger();
    if (isValid) {
      const formData = getValues();
      await onSubmit(formData);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Server className="w-4 h-4 mr-2" />
            Server Settings
          </TabsTrigger>
          <TabsTrigger value="test" disabled={!watch('host') || !watch('port')}>
            <TestTube2 className="w-4 h-4 mr-2" />
            Test Connection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                Configuration Name *
              </div>
              <Input
                id="name"
                {...register('name')}
                placeholder="My SMTP Server"
                error={errors.name?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                SMTP Host *
              </div>
              <Input
                id="host"
                {...register('host')}
                placeholder="smtp.example.com"
                error={errors.host?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                Port *
              </div>
              <Input
                id="port"
                type="number"
                {...register('port', { valueAsNumber: true })}
                placeholder="587"
                error={errors.port?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Connection Security</div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={secure}
                  onChange={(e) => setValue('secure', e.target.checked)}
                />
                <span className="text-sm">{secure ? 'TLS/SSL' : 'None (Not recommended)'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                Username *
              </div>
              <Input
                id="username"
                {...register('username')}
                placeholder="username"
                error={errors.username?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                {initialData?.id ? 'New Password (leave blank to keep current)' : 'Password *'}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {!initialData?.id && (
              <div className="space-y-2">
                <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password *
                </div>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    placeholder="••••••••"
                    error={errors.confirmPassword?.message}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                From Email *
              </div>
              <Input
                id="fromEmail"
                type="email"
                {...register('fromEmail')}
                placeholder="user@example.com"
                error={errors.fromEmail?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                From Name
              </div>
              <Input
                id="fromName"
                {...register('fromName')}
                placeholder="Your Name"
                error={errors.fromName?.message}
              />
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start space-x-3">
                <Switch
                  id="isDefault"
                  checked={watch('isDefault')}
                  onChange={(e) => setValue('isDefault', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-base font-medium">
                    Set as default configuration
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This configuration will be used by default for sending emails
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start space-x-3">
                <Switch
                  id="customDomain"
                  checked={customDomain}
                  onChange={(e) => setValue('customDomain', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-base font-medium">
                    Enable DKIM Signing (Advanced)
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sign emails with DKIM for better deliverability
                  </p>
                </div>
              </div>
            </div>

            {customDomain && (
              <>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                    DKIM Selector
                  </div>
                  <Input
                    id="dkimSelector"
                    {...register('dkimSelector')}
                    placeholder="default"
                    error={errors.dkimSelector?.message}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually 'default' or 's1' (check your DNS provider)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                    DKIM Domain
                  </div>
                  <Input
                    id="dkimDomain"
                    {...register('dkimDomain')}
                    placeholder="example.com"
                    error={errors.dkimDomain?.message}
                  />
                  <p className="text-xs text-muted-foreground">
                    The domain that will be signing the emails
                  </p>
                </div>

                <div className="space-y-2 col-span-2">
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
                    DKIM Private Key
                  </div>
                  <Textarea
                    id="dkimPrivateKey"
                    {...register('dkimPrivateKey')}
                    className="w-full min-h-[120px] p-2 font-mono text-sm border rounded-md bg-muted/20"
                    placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  />
                  {errors.dkimPrivateKey?.message ? (
                    <p className="text-sm text-destructive">{errors.dkimPrivateKey.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      The private key that will be used to sign outgoing emails
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {initialData ? 'Update Configuration' : 'Save Configuration'}
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card className="border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center mb-2">
                <TestTube2 className="w-5 h-5 mr-2 text-blue-500" />
                <h3 className="text-lg font-medium">Test SMTP Connection</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Send a test email to verify your SMTP configuration is working correctly
              </p>
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium mb-2">Test SMTP Connection</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Send a test email to verify your SMTP settings
                </p>
                <div className="flex items-center space-x-2">
                  <Input 
                    type="email" 
                    placeholder="test@example.com" 
                    className="flex-1"
                    value={fromEmail}
                    onChange={(e) => setValue('fromEmail', e.target.value)}
                  />
                  <Button 
                    type="button" 
                    onClick={handleTestConnection}
                    disabled={isTesting || !fromEmail}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : 'Test Connection'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
