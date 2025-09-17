import bcrypt from 'bcryptjs';
import multiAuthDatabase from '../config/database_multi_auth.js';

class LocalUser {
    // Create a new local user with email and password
    static async create(email, password) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise(async (resolve, reject) => {
            try {
                // Hash password with bcrypt (salt rounds: 12)
                const passwordHash = await bcrypt.hash(password, 12);
                
                const query = `
                    INSERT INTO local_users (email, password_hash)
                    VALUES (?, ?)
                `;
                
                db.run(query, [email, passwordHash], function(err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                            reject(new Error('Email already exists'));
                        } else {
                            reject(err);
                        }
                    } else {
                        // Return the created user
                        LocalUser.findById(this.lastID)
                            .then(user => resolve(user))
                            .catch(err => reject(err));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Find user by email
    static async findByEmail(email) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM local_users WHERE email = ?`;
            
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
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM local_users WHERE id = ?`;
            
            db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Verify password
    static async verifyPassword(email, password) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return null;
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (isValid) {
                return user;
            } else {
                return null;
            }
        } catch (error) {
            throw error;
        }
    }

    // Delete user by ID
    static async deleteById(id) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM local_users WHERE id = ?`;
            
            db.run(query, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Format user response (exclude password_hash)
    static formatUserResponse(user) {
        if (!user) return null;
        
        return {
            id: user.id,
            email: user.email,
            name: null, // Local users don't have names by default
            picture: null, // Local users don't have pictures by default
            provider: 'local',
            created_at: user.created_at
        };
    }
}

export default LocalUser;
