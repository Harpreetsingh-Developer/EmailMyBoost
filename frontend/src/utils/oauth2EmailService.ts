/**
 * EmailmyBoost OAuth2 API Usage Examples
 * 
 * This file demonstrates how to use the OAuth2 email sending API
 * for both Google (Gmail API) and Microsoft (Graph API) providers.
 */

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://app.emailmyboost.com';

// ==================== AUTHENTICATION EXAMPLES ====================

/**
 * Example 1: Initiate Google OAuth2 Login
 */
export async function initiateGoogleLogin(): Promise<string> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/google`);
        const data = await response.json();
        
        if (data.success) {
            // Redirect user to the OAuth URL
            window.location.href = data.authUrl;
            return data.authUrl;
        } else {
            throw new Error(data.error || 'Failed to get Google auth URL');
        }
    } catch (error) {
        console.error('Google login initiation failed:', error);
        throw error;
    }
}

/**
 * Example 2: Initiate Microsoft OAuth2 Login
 */
export async function initiateMicrosoftLogin(): Promise<string> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/microsoft`);
        const data = await response.json();
        
        if (data.success) {
            // Redirect user to the OAuth URL
            window.location.href = data.authUrl;
            return data.authUrl;
        } else {
            throw new Error(data.error || 'Failed to get Microsoft auth URL');
        }
    } catch (error) {
        console.error('Microsoft login initiation failed:', error);
        throw error;
    }
}

/**
 * Example 3: Get User Profile
 */
export async function getUserProfile(token: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.user;
        } else {
            throw new Error(data.error || 'Failed to get user profile');
        }
    } catch (error) {
        console.error('Get user profile failed:', error);
        throw error;
    }
}

// ==================== EMAIL SENDING EXAMPLES ====================

/**
 * Example 4: Send Email (Universal - Auto-detects Provider)
 */
export async function sendEmail(token: string, emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
    attachments?: any[];
}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(emailData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Email sent successfully via ${data.provider}!`);
            return data;
        } else {
            throw new Error(data.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
}

/**
 * Example 5: Send Email via Gmail API (Google Users Only)
 */
export async function sendEmailViaGmail(token: string, emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-email/gmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(emailData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Email sent via Gmail API! Message ID: ${data.messageId}`);
            return data;
        } else {
            throw new Error(data.error || 'Failed to send email via Gmail API');
        }
    } catch (error) {
        console.error('Gmail API email sending failed:', error);
        throw error;
    }
}

/**
 * Example 6: Send Email via Microsoft Graph API (Microsoft Users Only)
 */
export async function sendEmailViaOutlook(token: string, emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-email/outlook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(emailData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Email sent via Microsoft Graph API!');
            return data;
        } else {
            throw new Error(data.error || 'Failed to send email via Microsoft Graph API');
        }
    } catch (error) {
        console.error('Microsoft Graph API email sending failed:', error);
        throw error;
    }
}

// ==================== COMPLETE USAGE EXAMPLES ====================

/**
 * Example 7: Complete OAuth2 Email Sending Workflow
 */
export class OAuth2EmailService {
    private token: string | null = null;
    private user: any = null;

    constructor() {
        // Try to load token from localStorage
        this.token = localStorage.getItem('oauth_token');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        // Always check localStorage for the most recent token
        this.token = localStorage.getItem('oauth_token');
        return !!this.token;
    }

    /**
     * Login with Google
     */
    async loginWithGoogle(): Promise<void> {
        await initiateGoogleLogin();
    }

    /**
     * Login with Microsoft
     */
    async loginWithMicrosoft(): Promise<void> {
        await initiateMicrosoftLogin();
    }

    /**
     * Set token (usually called after OAuth callback)
     */
    setToken(token: string): void {
        this.token = token;
        localStorage.setItem('oauth_token', token);
    }

    /**
     * Get current user profile
     */
    async getCurrentUser() {
        // Always check localStorage for the most recent token
        this.token = localStorage.getItem('oauth_token');
        
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        if (!this.user) {
            this.user = await getUserProfile(this.token);
        }

        return this.user;
    }

    /**
     * Send email using the appropriate API based on user's provider
     */
    async sendEmail(emailData: {
        to: string;
        cc?: string;
        bcc?: string;
        subject: string;
        html: string;
    }) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        return await sendEmail(this.token, emailData);
    }

    /**
     * Send email specifically via Gmail API
     */
    async sendEmailViaGmail(emailData: {
        to: string;
        cc?: string;
        bcc?: string;
        subject: string;
        html: string;
    }) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        return await sendEmailViaGmail(this.token, emailData);
    }

    /**
     * Send email specifically via Microsoft Graph API
     */
    async sendEmailViaOutlook(emailData: {
        to: string;
        cc?: string;
        bcc?: string;
        subject: string;
        html: string;
    }) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        return await sendEmailViaOutlook(this.token, emailData);
    }

    /**
     * Logout
     */
    logout(): void {
        this.token = null;
        this.user = null;
        localStorage.removeItem('oauth_token');
    }
}

// ==================== USAGE EXAMPLES ====================

/**
 * Example 8: Basic Usage
 */
export async function basicUsageExample() {
    const emailService = new OAuth2EmailService();

    // Check if already authenticated
    if (!emailService.isAuthenticated()) {
        console.log('Not authenticated. Please login first.');
        // await emailService.loginWithGoogle(); // or loginWithMicrosoft()
        return;
    }

    // Get user info
    const user = await emailService.getCurrentUser();
    console.log('Current user:', user);

    // Send an email
    const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email from OAuth2 API',
        html: `
            <h2>Hello from EmailmyBoost!</h2>
            <p>This email was sent using OAuth2 authentication via <strong>${user.provider}</strong>.</p>
            <p>Sender: ${user.name} (${user.email})</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
        `
    };

    try {
        const result = await emailService.sendEmail(emailData);
        console.log('✅ Email sent successfully:', result);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

/**
 * Example 9: Advanced Usage with Error Handling
 */
export async function advancedUsageExample() {
    const emailService = new OAuth2EmailService();

    try {
        // Ensure user is authenticated
        if (!emailService.isAuthenticated()) {
            throw new Error('User must be authenticated first');
        }

        // Get user profile
        const user = await emailService.getCurrentUser();
        console.log(`📧 Sending email as ${user.name} (${user.email}) via ${user.provider}`);

        // Prepare email content
        const emailData = {
            to: 'recipient1@example.com, recipient2@example.com',
            cc: 'cc@example.com',
            bcc: 'bcc@example.com',
            subject: 'Advanced Email Example',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">📧 EmailmyBoost OAuth2 Example</h1>
                    <p>This email demonstrates advanced OAuth2 email sending capabilities.</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>Sender Information:</h3>
                        <ul>
                            <li><strong>Name:</strong> ${user.name}</li>
                            <li><strong>Email:</strong> ${user.email}</li>
                            <li><strong>Provider:</strong> ${user.provider}</li>
                            <li><strong>API:</strong> ${user.provider === 'google' ? 'Gmail API' : 'Microsoft Graph API'}</li>
                        </ul>
                    </div>
                    
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>✅ Features Demonstrated:</h3>
                        <ul>
                            <li>OAuth2 authentication with automatic token refresh</li>
                            <li>Multi-recipient support (TO, CC, BCC)</li>
                            <li>HTML email content</li>
                            <li>Provider-specific API routing</li>
                            <li>Secure token management</li>
                        </ul>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        Sent via EmailmyBoost OAuth2 Service at ${new Date().toLocaleString()}
                    </p>
                </div>
            `
        };

        // Send email using provider-specific method
        let result;
        if (user.provider === 'google') {
            result = await emailService.sendEmailViaGmail(emailData);
            console.log('✅ Email sent via Gmail API');
        } else if (user.provider === 'microsoft') {
            result = await emailService.sendEmailViaOutlook(emailData);
            console.log('✅ Email sent via Microsoft Graph API');
        } else {
            // Use universal endpoint (auto-detects provider)
            result = await emailService.sendEmail(emailData);
            console.log('✅ Email sent via universal endpoint');
        }

        return result;

    } catch (error) {
        console.error('❌ Advanced email sending failed:', error);
        
        // Handle specific error types
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('authentication')) {
            console.log('🔐 Authentication error - user needs to login again');
            emailService.logout();
        } else if (errorMessage.includes('token')) {
            console.log('🔄 Token error - attempting to refresh');
            // Token refresh is handled automatically by the server
        } else {
            console.log('📧 Email sending error - check email data and try again');
        }
        
        throw error;
    }
}

// Export the service class as default
export default OAuth2EmailService;

// Create and export a singleton instance
export const emailService = new OAuth2EmailService();
