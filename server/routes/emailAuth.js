import express from 'express';
import EmailPasswordUser from '../models/EmailPasswordUser.js';
import GoogleOAuthUser from '../models/GoogleOAuthUser.js';
import MicrosoftOAuthUser from '../models/MicrosoftOAuthUser.js';
import { google } from 'googleapis';

const router = express.Router();

// Email + App Password Authentication
router.post('/auth/email-password', async (req, res) => {
    try {
        const { action, email, appPassword } = req.body;

        if (!email || !appPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email and app password are required'
            });
        }

        let user;
        if (action === 'register') {
            user = await EmailPasswordUser.register(email, appPassword);
        } else if (action === 'login') {
            user = await EmailPasswordUser.login(email, appPassword);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                error: 'Action must be "register" or "login"'
            });
        }

        const accountData = EmailPasswordUser.formatAccountResponse(user);
        
        res.json({
            success: true,
            message: action === 'register' ? 'Registration successful' : 'Login successful',
            account: accountData
        });

    } catch (error) {
        console.error('Email+Password authentication error:', error);
        
        if (error.message === 'Email already registered') {
            res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Authentication failed'
            });
        }
    }
});

// Google OAuth Authentication
router.post('/auth/google-oauth', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code is required'
            });
        }

        // Setup Google OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri || process.env.GOOGLE_REDIRECT_URI
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getAccessToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();

        // Store tokens and user info
        const user = await GoogleOAuthUser.store(tokens, userInfo);
        const accountData = GoogleOAuthUser.formatAccountResponse(user);

        res.json({
            success: true,
            message: 'Google OAuth authentication successful',
            account: accountData
        });

    } catch (error) {
        console.error('Google OAuth authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Google OAuth authentication failed'
        });
    }
});

// Microsoft OAuth Authentication
router.post('/auth/microsoft-oauth', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code is required'
            });
        }

        // Exchange code for tokens
        const tokenRequestBody = new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri || process.env.MICROSOFT_REDIRECT_URI,
            grant_type: 'authorization_code',
            scope: 'https://graph.microsoft.com/Mail.Send offline_access'
        });

        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenRequestBody
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${tokens.error_description}`);
        }

        // Get user info using the access token
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        const userInfo = await userResponse.json();

        if (!userResponse.ok) {
            throw new Error(`User info fetch failed: ${userInfo.error?.message}`);
        }

        // Store tokens and user info
        const user = await MicrosoftOAuthUser.store(tokens, userInfo);
        const accountData = MicrosoftOAuthUser.formatAccountResponse(user);

        res.json({
            success: true,
            message: 'Microsoft OAuth authentication successful',
            account: accountData
        });

    } catch (error) {
        console.error('Microsoft OAuth authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Microsoft OAuth authentication failed'
        });
    }
});

// Get all email accounts
router.get('/accounts', async (req, res) => {
    try {
        const accounts = [];

        // This is a simple implementation - in a real app you might want 
        // user-specific accounts or pagination
        
        res.json({
            success: true,
            accounts: accounts,
            message: 'Use specific authentication endpoints to add accounts'
        });

    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve accounts'
        });
    }
});

// Get account by email and provider
router.get('/account/:provider/:email', async (req, res) => {
    try {
        const { provider, email } = req.params;
        let user = null;
        let accountData = null;

        switch (provider) {
            case 'email':
                user = await EmailPasswordUser.findByEmail(email);
                accountData = EmailPasswordUser.formatAccountResponse(user);
                break;
            case 'google':
                user = await GoogleOAuthUser.findByEmail(email);
                accountData = GoogleOAuthUser.formatAccountResponse(user);
                break;
            case 'microsoft':
                user = await MicrosoftOAuthUser.findByEmail(email);
                accountData = MicrosoftOAuthUser.formatAccountResponse(user);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid provider. Must be: email, google, or microsoft'
                });
        }

        if (!accountData) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        res.json({
            success: true,
            account: accountData
        });

    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve account'
        });
    }
});

// Refresh tokens for OAuth accounts
router.post('/refresh-token/:provider/:email', async (req, res) => {
    try {
        const { provider, email } = req.params;

        if (provider === 'google') {
            const user = await GoogleOAuthUser.findByEmail(email);
            if (!user || !user.refresh_token) {
                return res.status(404).json({
                    success: false,
                    error: 'Google account not found or no refresh token'
                });
            }

            // Refresh Google token
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            oauth2Client.setCredentials({ refresh_token: user.refresh_token });
            
            const { credentials } = await oauth2Client.refreshAccessToken();
            await GoogleOAuthUser.updateTokens(user.google_id, credentials);
            
            const updatedUser = await GoogleOAuthUser.findByEmail(email);
            const accountData = GoogleOAuthUser.formatAccountResponse(updatedUser);

            res.json({
                success: true,
                message: 'Google token refreshed successfully',
                account: accountData
            });

        } else if (provider === 'microsoft') {
            const user = await MicrosoftOAuthUser.findByEmail(email);
            if (!user || !user.refresh_token) {
                return res.status(404).json({
                    success: false,
                    error: 'Microsoft account not found or no refresh token'
                });
            }

            // Refresh Microsoft token
            const refreshBody = new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                refresh_token: user.refresh_token,
                grant_type: 'refresh_token',
                scope: 'https://graph.microsoft.com/Mail.Send offline_access'
            });

            const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: refreshBody
            });

            const newTokens = await refreshResponse.json();
            await MicrosoftOAuthUser.updateTokens(user.microsoft_id, newTokens);
            
            const updatedUser = await MicrosoftOAuthUser.findByEmail(email);
            const accountData = MicrosoftOAuthUser.formatAccountResponse(updatedUser);

            res.json({
                success: true,
                message: 'Microsoft token refreshed successfully',
                account: accountData
            });

        } else {
            res.status(400).json({
                success: false,
                error: 'Token refresh not supported for this provider'
            });
        }

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

export default router;
