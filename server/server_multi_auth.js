import express from 'express';
import cors from 'cors';
import multiAuthDatabase from './config/database_multi_auth.js';
import multiAuthRoutes from './routes/multiAuth.js';

const app = express();
const PORT = process.env.PORT || 3001; // Different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
async function initializeDatabase() {
    try {
        await multiAuthDatabase.init();
        console.log('🚀 Multi-auth database initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize multi-auth database:', error);
        process.exit(1);
    }
}

// Routes
app.use('/api/auth', multiAuthRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Multi-Auth Server is running',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Multi-Auth API is working!',
        endpoints: {
            local: {
                register: 'POST /api/auth/local/register',
                login: 'POST /api/auth/local/login'
            },
            google: {
                login: 'POST /api/auth/google/login'
            },
            microsoft: {
                login: 'POST /api/auth/microsoft/login'
            },
            general: {
                me: 'GET /api/auth/me (requires Authorization header)'
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log('🌟 ============================================');
            console.log('🚀 Multi-Auth Server Started Successfully!');
            console.log('🌟 ============================================');
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
            console.log('🔐 Authentication endpoints:');
            console.log(`   📧 Local Register: POST ${PORT}/api/auth/local/register`);
            console.log(`   🔑 Local Login: POST ${PORT}/api/auth/local/login`);
            console.log(`   🟢 Google Login: POST ${PORT}/api/auth/google/login`);
            console.log(`   🔵 Microsoft Login: POST ${PORT}/api/auth/microsoft/login`);
            console.log(`   👤 Current User: GET ${PORT}/api/auth/me`);
            console.log('🌟 ============================================');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down multi-auth server...');
    multiAuthDatabase.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down multi-auth server...');
    multiAuthDatabase.close();
    process.exit(0);
});

// Start the server
startServer();
