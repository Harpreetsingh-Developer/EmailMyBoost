import emailAuthDatabase from '../config/emailAuthDatabase.js';

class MicrosoftOAuthUser {
    // Store Microsoft OAuth tokens for email sending
    static async store(microsoftTokens, userInfo) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            try {
                const query = `
                    INSERT OR REPLACE INTO users_microsoft_oauth 
                    (email, microsoft_id, access_token, refresh_token, token_expiry, scope)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const tokenExpiry = microsoftTokens.expires_on ? 
                    new Date(microsoftTokens.expires_on * 1000).toISOString() : null;
                
                db.run(query, [
                    userInfo.mail || userInfo.userPrincipalName,
                    userInfo.id,
                    microsoftTokens.access_token,
                    microsoftTokens.refresh_token,
                    tokenExpiry,
                    microsoftTokens.scope || 'https://graph.microsoft.com/Mail.Send'
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Return the created/updated user
                        MicrosoftOAuthUser.findById(this.lastID || userInfo.id)
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
            const query = `SELECT * FROM users_microsoft_oauth WHERE email = ?`;
            
            db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    // Get user by Microsoft ID
    static async findByMicrosoftId(microsoftId) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users_microsoft_oauth WHERE microsoft_id = ?`;
            
            db.get(query, [microsoftId], (err, row) => {
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
            const query = `SELECT * FROM users_microsoft_oauth WHERE id = ?`;
            
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
    static async updateTokens(microsoftId, tokens) {
        const db = emailAuthDatabase.getDB();
        
        return new Promise((resolve, reject) => {
            const tokenExpiry = tokens.expires_on ? 
                new Date(tokens.expires_on * 1000).toISOString() : null;
            
            const query = `
                UPDATE users_microsoft_oauth 
                SET access_token = ?, refresh_token = COALESCE(?, refresh_token), 
                    token_expiry = ?, updated_at = CURRENT_TIMESTAMP
                WHERE microsoft_id = ?
            `;
            
            db.run(query, [
                tokens.access_token,
                tokens.refresh_token,
                tokenExpiry,
                microsoftId
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    MicrosoftOAuthUser.findByMicrosoftId(microsoftId)
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
            microsoft_id: user.microsoft_id
        };
    }

    // Format response for the main app
    static formatAccountResponse(user) {
        if (!user) return null;
        
        return {
            provider: 'microsoft',
            email: user.email,
            account_id: user.microsoft_id,
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

export default MicrosoftOAuthUser;
