import { API_ENDPOINTS } from '../config/api';
import { SMTPConfig, SMTPTestRequest, SMTPTestResult } from '../types/smtp';

class SMTPService {
  private static instance: SMTPService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = API_ENDPOINTS.SMTP.CONFIG;
  }

  public static getInstance(): SMTPService {
    if (!SMTPService.instance) {
      SMTPService.instance = new SMTPService();
    }
    return SMTPService.instance;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Something went wrong');
    }

    return response.json();
  }

  // Get all SMTP configurations for the current user
  public async getConfigs(): Promise<SMTPConfig[]> {
    const response = await this.request('');
    return response.data || [];
  }

  // Get a single SMTP configuration by ID
  public async getConfig(id: string): Promise<SMTPConfig> {
    const response = await this.request(`/${id}`);
    return response.data;
  }

  // Create a new SMTP configuration
  public async createConfig(config: Omit<SMTPConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SMTPConfig> {
    const response = await this.request('', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    return response.data;
  }

  // Update an existing SMTP configuration
  public async updateConfig(id: string, config: Partial<SMTPConfig>): Promise<SMTPConfig> {
    const response = await this.request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return response.data;
  }

  // Delete an SMTP configuration
  public async deleteConfig(id: string): Promise<void> {
    await this.request(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Test SMTP connection
  public async testConnection(config: SMTPTestRequest): Promise<SMTPTestResult> {
    const response = await this.request('/test', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    return response;
  }

  // Set default SMTP configuration
  public async setDefaultConfig(id: string): Promise<SMTPConfig> {
    const response = await this.request(`/${id}/set-default`, {
      method: 'PATCH',
    });
    return response.data;
  }
}

export const smtpService = SMTPService.getInstance();
