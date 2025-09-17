import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database path in server directory
const dbPath = join(__dirname, '..', 'database.sqlite');

class Database {
    constructor() {
        this.db = null;
    }

    // Initialize database connection and create tables
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    // Create users and app_credentials tables
    async createTables() {
        return new Promise((resolve, reject) => {
            // New OAuth-based users table
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    auth_provider TEXT CHECK(auth_provider IN ('google', 'microsoft')) NOT NULL,
                    provider_sub TEXT NOT NULL,
                    email TEXT,
                    name TEXT,
                    picture TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(auth_provider, provider_sub)
                )
            `;

            // Separate table for app credentials
            const createAppCredentialsTable = `
                CREATE TABLE IF NOT EXISTS app_credentials (
                    user_id INTEGER PRIMARY KEY,
                    app_password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `;

            // Create users table first
            this.db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    reject(err);
                } else {
                    console.log('✅ Users table created/verified');
                    
                    // Create app_credentials table
                    this.db.run(createAppCredentialsTable, (err) => {
                        if (err) {
                            console.error('Error creating app_credentials table:', err);
                            reject(err);
                        } else {
                            console.log('✅ App credentials table created/verified');
                            resolve();
                        }
                    });
                }
            });
        });
    }

    // Get database instance
    getDB() {
        return this.db;
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

// Create and export singleton instance
const database = new Database();

export { database as default };
