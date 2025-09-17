import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import LocalUser from '../models/LocalUser.js';
import GoogleUser from '../models/GoogleUser.js';
import MicrosoftUser from '../models/MicrosoftUser.js';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Generate JWT token
function generateJWT(user, provider) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            provider: provider
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// ==================== LOCAL AUTHENTICATION ====================

// Local user registration
router.post('/local/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Create user
        const user = await LocalUser.create(email, password);
        const userResponse = LocalUser.formatUserResponse(user);
        const token = generateJWT(userResponse, 'local');

        console.log(`✅ Local user registered: ${email}`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token: token,
            user: userResponse
        });

    } catch (error) {
        console.error('Local registration error:', error);
        
        if (error.message === 'Email already exists') {
            return res.status(409).json({
                success: false,
                error: 'Email already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

// Local user login
router.post('/local/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Verify credentials
        const user = await LocalUser.verifyPassword(email, password);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const userResponse = LocalUser.formatUserResponse(user);
        const token = generateJWT(userResponse, 'local');

        console.log(`✅ Local user logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: userResponse
        });

    } catch (error) {
        console.error('Local login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// ==================== GOOGLE AUTHENTICATION ====================

// Google OAuth login
router.post('/google/login', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: 'Google ID token is required'
            });
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;

        // Create or update user
        const user = await GoogleUser.createOrUpdate(sub, email, name, picture);
        const userResponse = GoogleUser.formatUserResponse(user);
        const token = generateJWT(userResponse, 'google');

        console.log(`✅ Google user logged in: ${email}`);

        res.json({
            success: true,
            message: 'Google login successful',
            token: token,
            user: userResponse
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid Google token'
        });
    }
});

// ==================== MICROSOFT AUTHENTICATION ====================

// Microsoft OAuth login
router.post('/microsoft/login', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: 'Microsoft ID token is required'
            });
        }

        // For Microsoft, you would need to verify the token against Microsoft's public keys
        // This is a simplified version - in production, use proper token verification
        try {
            // Decode token (in production, verify signature against Microsoft public keys)
            const base64Payload = idToken.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
            
            const { oid, email, name } = payload;
            
            if (!oid) {
                throw new Error('Invalid Microsoft token - missing oid');
            }

            // Create or update user
            const user = await MicrosoftUser.createOrUpdate(oid, email, name, null);
            const userResponse = MicrosoftUser.formatUserResponse(user);
            const token = generateJWT(userResponse, 'microsoft');

            console.log(`✅ Microsoft user logged in: ${email}`);

            res.json({
                success: true,
                message: 'Microsoft login successful',
                token: token,
                user: userResponse
            });

        } catch (tokenError) {
            throw new Error('Invalid Microsoft token format');
        }

    } catch (error) {
        console.error('Microsoft login error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid Microsoft token'
        });
    }
});

// ==================== TOKEN VERIFICATION ====================

// Verify JWT token middleware
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

// Get current user info (protected route example)
router.get('/me', verifyToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

export default router;
