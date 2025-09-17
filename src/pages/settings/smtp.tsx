import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SMTPConfigList } from '../../components/smtp/SMTPConfigList';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Mail, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SMTPSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('smtp');

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to manage your SMTP settings.</p>
        </div>
        <Button onClick={() => navigate('/login')}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Settings
      </Button>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
            <p className="text-muted-foreground">
              Manage your email sending configurations
            </p>
          </div>
        </div>

        <Tabs 
          defaultValue={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="smtp">
              <Mail className="mr-2 h-4 w-4" />
              SMTP Configurations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smtp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configurations</CardTitle>
                <CardDescription>
                  Add and manage your SMTP server configurations for sending emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SMTPConfigList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
