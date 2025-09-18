import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Create axios instance with default config
const apiClient = axios.create({
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add provider token if available
    const providerToken = localStorage.getItem('providerToken');
    if (providerToken) {
      config.headers['X-Provider-Token'] = providerToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Send a single email
 */
export const sendEmail = async (emailData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.SEND_EMAIL, emailData);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Start a bulk email sending job
 */
export const startBulkEmailJob = async (bulkEmailData) => {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.SEND_BULK_EMAIL_START, 
      bulkEmailData
    );
    return response.data;
  } catch (error) {
    console.error('Error starting bulk email job:', error);
    throw error;
  }
};

/**
 * Check the progress of a bulk email sending job
 */
export const checkBulkEmailProgress = async (jobId) => {
  try {
    const response = await apiClient.get(
      API_ENDPOINTS.SEND_BULK_EMAIL_PROGRESS(jobId)
    );
    return response.data;
  } catch (error) {
    console.error('Error checking bulk email progress:', error);
    throw error;
  }
};

/**
 * Get SMTP configuration
 */
export const getSmtpConfig = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SMTP.CONFIG);
    return response.data;
  } catch (error) {
    console.error('Error getting SMTP config:', error);
    throw error;
  }
};

/**
 * Save SMTP configuration
 */
export const saveSmtpConfig = async (smtpConfig) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.SMTP.CONFIG, smtpConfig);
    return response.data;
  } catch (error) {
    console.error('Error saving SMTP config:', error);
    throw error;
  }
};

/**
 * Test SMTP configuration
 */
export const testSmtpConfig = async (smtpConfig) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.SMTP.TEST, smtpConfig);
    return response.data;
  } catch (error) {
    console.error('Error testing SMTP config:', error);
    throw error;
  }
};

export default {
  sendEmail,
  startBulkEmailJob,
  checkBulkEmailProgress,
  getSmtpConfig,
  saveSmtpConfig,
  testSmtpConfig,
};