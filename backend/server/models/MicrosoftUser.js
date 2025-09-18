import multiAuthDatabase from '../config/database_multi_auth.js';

class MicrosoftUser {
    // Create or update Microsoft user
    static async createOrUpdate(microsoftOid, email, name, picture) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            // First check if user exists
            this.findByMicrosoftOid(microsoftOid)
                .then(existingUser => {
                    if (existingUser) {
                        // Update existing user
                        const updateQuery = `
                            UPDATE microsoft_users 
                            SET email = ?, name = ?, picture = ?
                            WHERE microsoft_oid = ?
                        `;
                        
                        db.run(updateQuery, [email, name, picture, microsoftOid], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                MicrosoftUser.findByMicrosoftOid(microsoftOid)
                                    .then(user => resolve(user))
                                    .catch(err => reject(err));
                            }
                        });
                    } else {
                        // Create new user
                        const insertQuery = `
                            INSERT INTO microsoft_users (microsoft_oid, email, name, picture)
                            VALUES (?, ?, ?, ?)
                        `;
                        
                        db.run(insertQuery, [microsoftOid, email, name, picture], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                MicrosoftUser.findById(this.lastID)
                                    .then(user => resolve(user))
                                    .catch(err => reject(err));
                            }
                        });
                    }
                })
                .catch(reject);
        });
    }

    // Find user by Microsoft OID (unique identifier)
    static async findByMicrosoftOid(microsoftOid) {
        const db = multiAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM microsoft_users WHERE microsoft_oid = ?`;
            
            db.get(query, [microsoftOid], (err, row) => {
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
            const query = `SELECT * FROM microsoft_users WHERE id = ?`;
            
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
            const query = `SELECT * FROM microsoft_users WHERE email = ?`;
            
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
            const query = `DELETE FROM microsoft_users WHERE id = ?`;
            
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
            provider: 'microsoft',
            created_at: user.created_at
        };
    }
}

export default MicrosoftUser;
