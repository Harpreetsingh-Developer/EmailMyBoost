import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database path in server directory
const dbPath = join(__dirname, '..', 'email_auth_database.sqlite');

class EmailAuthDatabase {
    constructor() {
        this.db = null;
    }

    // Initialize database connection and create tables
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening email auth database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to Email Auth SQLite database');
                    this.createTables()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    // Create all email authentication tables
    async createTables() {
        return new Promise((resolve, reject) => {
            const tables = [
                // Email + App Password users
                `CREATE TABLE IF NOT EXISTS users_email_password (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    app_password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // Google OAuth2 users
                `CREATE TABLE IF NOT EXISTS users_google_oauth (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // Microsoft OAuth2 users
                `CREATE TABLE IF NOT EXISTS users_microsoft_oauth (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ];

            let completedTables = 0;
            const totalTables = tables.length;

            tables.forEach((tableSQL, index) => {
                this.db.run(tableSQL, (err) => {
                    if (err) {
                        console.error(`Error creating email auth table ${index + 1}:`, err);
                        reject(err);
                    } else {
                        completedTables++;
                        console.log(`✅ Email auth table ${index + 1}/${totalTables} created/verified`);
                        
                        if (completedTables === totalTables) {
                            console.log('✅ All email authentication tables created successfully');
                            resolve();
                        }
                    }
                });
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
                    console.error('Error closing email auth database:', err);
                } else {
                    console.log('Email auth database connection closed');
                }
            });
        }
    }
}

// Create and export singleton instance
const emailAuthDatabase = new EmailAuthDatabase();
export default emailAuthDatabase;
