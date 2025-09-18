// SMTP Configuration Type
export interface SMTPConfig {
  id?: string;
  userId?: string;
  name?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  isDefault?: boolean;
  customDomain: boolean;
  dkimPrivateKey?: string;
  dkimSelector?: string;
  dkimDomain?: string;
  createdAt?: string;
  updatedAt?: string;
}

// SMTP Configuration Form Type
export interface SMTPConfigFormData extends Omit<SMTPConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  confirmPassword?: string;
}

// SMTP Test Result Type
export interface SMTPTestResult {
  success: boolean;
  message: string;
  error?: string;
}

// SMTP Configuration API Response
export interface SMTPConfigResponse {
  success: boolean;
  data?: SMTPConfig;
  error?: string;
}

export interface SMTPConfigListResponse {
  success: boolean;
  data: SMTPConfig[];
  error?: string;
}

// SMTP Test Request Type
export interface SMTPTestRequest {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  toEmail: string;
}
