import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Icons } from '../icons';
import { smtpService } from '../../services/smtpService';
import { useToast } from '../ui/use-toast';

interface SMTPTestConnectionProps {
  configId?: string;
  email?: string;
  className?: string;
}

export function SMTPTestConnection({ 
  configId, 
  email: initialEmail = '',
  className = '' 
}: SMTPTestConnectionProps) {
  const [testEmail, setTestEmail] = useState(initialEmail);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const handleTestConnection = async () => {
    if (!configId) {
      toast({
        title: 'Error',
        description: 'No SMTP configuration selected',
        variant: 'destructive',
      });
      return;
    }

    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address to test with',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await smtpService.testConfig(configId, { testEmail });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Test email sent successfully!',
        });
      } else {
        throw new Error(result.message || 'Failed to send test email');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to test SMTP connection',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="test-email">Test Email Address</Label>
        <div className="flex space-x-2">
          <Input
            id="test-email"
            type="email"
            placeholder="Enter email to test with"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="button" 
            onClick={handleTestConnection}
            disabled={isTesting || !configId}
            className="whitespace-nowrap"
          >
            {isTesting ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.mail className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Send a test email to verify your SMTP configuration
        </p>
      </div>
    </div>
  );
}
