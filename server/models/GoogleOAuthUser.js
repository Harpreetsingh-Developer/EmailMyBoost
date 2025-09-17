import emailAuthDatabase from '../config/emailAuthDatabase.js';

class GoogleOAuthUser {
    // Store Google OAuth tokens for email sending
    static async store(googleTokens, userInfo) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            try {
                const query = `
                    INSERT OR REPLACE INTO users_google_oauth 
                    (email, google_id, access_token, refresh_token, token_expiry, scope)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const tokenExpiry = googleTokens.expiry_date ? 
                    new Date(googleTokens.expiry_date).toISOString() : null;
                
                db.run(query, [
                    userInfo.email,
                    userInfo.sub || userInfo.id,
                    googleTokens.access_token,
                    googleTokens.refresh_token,
                    tokenExpiry,
                    googleTokens.scope || 'https://www.googleapis.com/auth/gmail.send'
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Return the created/updated user
                        GoogleOAuthUser.findById(this.lastID || userInfo.sub)
                            .then(user => resolve(user))
                            .catch(err => reject(err));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Get user by email
    static async findByEmail(email) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users_google_oauth WHERE email = ?`;
            
            db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Get user by Google ID
    static async findByGoogleId(googleId) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users_google_oauth WHERE google_id = ?`;
            
            db.get(query, [googleId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Get user by ID
    static async findById(id) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users_google_oauth WHERE id = ?`;
            
            db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Check if token is expired
    static isTokenExpired(user) {
        if (!user || !user.token_expiry) return true;
        
        const expiry = new Date(user.token_expiry);
        const now = new Date();
        
        // Add 5 minute buffer
        return expiry.getTime() - now.getTime() < 5 * 60 * 1000;
    }

    // Update tokens after refresh
    static async updateTokens(googleId, tokens) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const tokenExpiry = tokens.expiry_date ? 
                new Date(tokens.expiry_date).toISOString() : null;
            
            const query = `
                UPDATE users_google_oauth 
                SET access_token = ?, refresh_token = COALESCE(?, refresh_token), 
                    token_expiry = ?, updated_at = CURRENT_TIMESTAMP
                WHERE google_id = ?
            `;
            
            db.run(query, [
                tokens.access_token,
                tokens.refresh_token,
                tokenExpiry,
                googleId
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    GoogleOAuthUser.findByGoogleId(googleId)
                        .then(user => resolve(user))
                        .catch(err => reject(err));
                }
            });
        });
    }

    // Get tokens for email sending
    static async getTokensForSending(email) {
        const user = await this.findByEmail(email);
        if (!user) return null;

        return {
            access_token: user.access_token,
            refresh_token: user.refresh_token,
            token_expiry: user.token_expiry,
            scope: user.scope,
            google_id: user.google_id
        };
    }

    // Format response for the main app
    static formatAccountResponse(user) {
        if (!user) return null;
        
        return {
            provider: 'google',
            email: user.email,
            account_id: user.google_id,
            tokens: {
                access_token: user.access_token,
                refresh_token: user.refresh_token,
                token_expiry: user.token_expiry,
                scope: user.scope
            },
            created_at: user.created_at
        };
    }
}

export default GoogleOAuthUser;
