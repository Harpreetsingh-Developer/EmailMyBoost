import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Check, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { SMTPConfig } from '../../types/smtp';
import { smtpService } from '../../services/smtpService';
import { useToast } from '../ui/use-toast';
import { SMTPConfigForm } from './SMTPConfigForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';

export function SMTPConfigList() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<SMTPConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SMTPConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isSettingDefault, setIsSettingDefault] = useState<Record<string, boolean>>({});

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await smtpService.getConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching SMTP configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SMTP configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      setIsDeleting(prev => ({ ...prev, [id]: true }));
      await smtpService.deleteConfig(id);
      await fetchConfigs();
      toast({
        title: 'Success',
        description: 'SMTP configuration deleted successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting SMTP configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete SMTP configuration',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setIsSettingDefault(prev => ({ ...prev, [id]: true }));
      await smtpService.setDefaultConfig(id);
      await fetchConfigs();
      toast({
        title: 'Success',
        description: 'Default SMTP configuration updated',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error setting default SMTP configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to set default SMTP configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSettingDefault(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedConfig(null);
    fetchConfigs();
  };

  const handleEdit = (config: SMTPConfig) => {
    setSelectedConfig(config);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading SMTP configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">SMTP Configurations</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedConfig(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add SMTP Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>
                {selectedConfig ? 'Edit SMTP Configuration' : 'Add New SMTP Configuration'}
              </DialogTitle>
            </DialogHeader>
            <SMTPConfigForm
              initialData={selectedConfig || undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No SMTP configurations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a new SMTP configuration.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add SMTP Configuration
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>From Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {config.name}
                      {config.isDefault && (
                        <Badge variant="outline" className="ml-2">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{config.host}:{config.port}</TableCell>
                  <TableCell>
                    {config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail}
                  </TableCell>
                  <TableCell>
                    {config.isDefault ? (
                      <span className="inline-flex items-center text-green-600">
                        <Check className="h-4 w-4 mr-1" /> Active
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(config.id!)}
                        disabled={isSettingDefault[config.id!]}
                      >
                        {isSettingDefault[config.id!] ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          'Set as default'
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(config.id!)}
                        disabled={isDeleting[config.id!]}
                      >
                        {isDeleting[config.id!] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
