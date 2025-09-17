import bcrypt from 'bcryptjs';
import emailAuthDatabase from '../config/emailAuthDatabase.js';

class EmailPasswordUser {
    // Register user with email and app password
    static async register(email, appPassword) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise(async (resolve, reject) => {
            try {
                // Hash the app password for security
                const appPasswordHash = await bcrypt.hash(appPassword, 12);
                
                const query = `
                    INSERT INTO users_email_password (email, app_password_hash)
                    VALUES (?, ?)
                `;
                
                db.run(query, [email, appPasswordHash], function(err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                            reject(new Error('Email already registered'));
                        } else {
                            reject(err);
                        }
                    } else {
                        // Return the created user
                        EmailPasswordUser.findById(this.lastID)
                            .then(user => resolve(user))
                            .catch(err => reject(err));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Login user with email and app password
    static async login(email, appPassword) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return null;
            }

            const isValid = await bcrypt.compare(appPassword, user.app_password_hash);
            if (isValid) {
                return user;
            } else {
                return null;
            }
        } catch (error) {
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users_email_password WHERE email = ?`;
            
            db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Find user by ID
    static async findById(id) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users_email_password WHERE id = ?`;
            
            db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Get app password for email sending (decrypt for SMTP use)
    static async getAppPasswordForSending(email) {
        // Note: In a real implementation, you might want to store the app password 
        // encrypted (not hashed) so you can decrypt it for SMTP use
        // For now, this returns a reference that the email service can use
        const user = await this.findByEmail(email);
        return user ? { email: user.email, hasPassword: true } : null;
    }

    // Format response for the main app
    static formatAccountResponse(user) {
        if (!user) return null;
        
        return {
            provider: 'email',
            email: user.email,
            account_id: user.id,
            tokens: {
                type: 'app_password_hash',
                reference: user.id // Reference to retrieve password for SMTP
            },
            created_at: user.created_at
        };
    }
}

export default EmailPasswordUser;
