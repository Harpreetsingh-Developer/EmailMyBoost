import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database path in server directory
const dbPath = join(__dirname, '..', 'multi_auth_database.sqlite');

class MultiAuthDatabase {
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
                    console.log('✅ Connected to Multi-Auth SQLite database');
                    this.createTables()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    // Create all authentication tables
    async createTables() {
        return new Promise((resolve, reject) => {
            const tables = [
                // Local users table
                `CREATE TABLE IF NOT EXISTS local_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // Google users table
                `CREATE TABLE IF NOT EXISTS google_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_sub TEXT UNIQUE NOT NULL,
                    email TEXT,
                    name TEXT,
                    picture TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // Microsoft users table
                `CREATE TABLE IF NOT EXISTS microsoft_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    microsoft_oid TEXT UNIQUE NOT NULL,
                    email TEXT,
                    name TEXT,
                    picture TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ];

            let completedTables = 0;
            const totalTables = tables.length;

            tables.forEach((tableSQL, index) => {
                this.db.run(tableSQL, (err) => {
                    if (err) {
                        console.error(`Error creating table ${index + 1}:`, err);
                        reject(err);
                    } else {
                        completedTables++;
                        console.log(`✅ Table ${index + 1}/${totalTables} created/verified`);
                        
                        if (completedTables === totalTables) {
                            console.log('✅ All multi-auth tables created successfully');
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
                    console.error('Error closing database:', err);
                } else {
                    console.log('Multi-auth database connection closed');
                }
            });
        }
    }
}

// Create and export singleton instance
const multiAuthDatabase = new MultiAuthDatabase();
export default multiAuthDatabase;
