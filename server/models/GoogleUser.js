import multiAuthDatabase from '../config/database_multi_auth.js';

class GoogleUser {
    // Create or update Google user
    static async createOrUpdate(googleSub, email, name, picture) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            // First check if user exists
            this.findByGoogleSub(googleSub)
                .then(existingUser => {
                    if (existingUser) {
                        // Update existing user
                        const updateQuery = `
                            UPDATE google_users 
                            SET email = ?, name = ?, picture = ?
                            WHERE google_sub = ?
                        `;
                        
                        db.run(updateQuery, [email, name, picture, googleSub], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                GoogleUser.findByGoogleSub(googleSub)
                                    .then(user => resolve(user))
                                    .catch(err => reject(err));
                            }
                        });
                    } else {
                        // Create new user
                        const insertQuery = `
                            INSERT INTO google_users (google_sub, email, name, picture)
                            VALUES (?, ?, ?, ?)
                        `;
                        
                        db.run(insertQuery, [googleSub, email, name, picture], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                GoogleUser.findById(this.lastID)
                                    .then(user => resolve(user))
                                    .catch(err => reject(err));
                            }
                        });
                    }
                })
                .catch(reject);
        });
    }

    // Find user by Google sub (unique identifier)
    static async findByGoogleSub(googleSub) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM google_users WHERE google_sub = ?`;
            
            db.get(query, [googleSub], (err, row) => {
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
            const query = `SELECT * FROM google_users WHERE id = ?`;
            
            db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Find user by email (note: not unique, could return multiple users)
    static async findByEmail(email) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM google_users WHERE email = ?`;
            
            db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Delete user by ID
    static async deleteById(id) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM google_users WHERE id = ?`;
            
            db.run(query, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Format user response
    static formatUserResponse(user) {
        if (!user) return null;
        
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            provider: 'google',
            created_at: user.created_at
        };
    }
}

export default GoogleUser;
