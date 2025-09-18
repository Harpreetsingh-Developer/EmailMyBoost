// API configuration for different environments
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://emailmyboost.onrender.com/api'
    : 'http://localhost:5000/api');

export const API_ENDPOINTS = {
  // Email endpoints
  SEND_EMAIL: `${API_BASE_URL}/api/send-email`,
  SEND_BULK_EMAIL_START: `${API_BASE_URL}/api/supabase/send-bulk-email/start`,
  SEND_BULK_EMAIL_PROGRESS: (jobId: string) => `${API_BASE_URL}/api/supabase/send-bulk-email/progress/${jobId}`,
  FEEDBACK: `${API_BASE_URL}/api/feedback`,
  
  // Authentication endpoints
  AUTH: {
    // OAuth endpoints
    GOOGLE_AUTH: `${API_BASE_URL}/api/auth/google`,
    GOOGLE_CALLBACK: `${API_BASE_URL}/api/auth/google/callback`,
    MICROSOFT_AUTH: `${API_BASE_URL}/api/auth/microsoft`,
    MICROSOFT_CALLBACK: `${API_BASE_URL}/api/auth/microsoft/callback`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    TOKEN: `${API_BASE_URL}/api/auth/token`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
    ME: `${API_BASE_URL}/api/auth/me`,
  },
  
  // SMTP configuration endpoints
  SMTP: {
    CONFIG: `${API_BASE_URL}/api/smtp/config`,
    TEST: `${API_BASE_URL}/api/smtp/test`,
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
export { API_BASE_URL };