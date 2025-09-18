import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

class MicrosoftTokenVerifier {
    constructor() {
        this.client = jwksClient({
            jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
            requestHeaders: {}, // Optional
            timeout: 30000, // Defaults to 30s
        });
    }

    // Get signing key for Microsoft token
    async getKey(header, callback) {
        try {
            const key = await this.client.getSigningKey(header.kid);
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
        } catch (error) {
            callback(error);
        }
    }

    // Verify Microsoft ID token
    async verifyToken(idToken, audience = null) {
        return new Promise((resolve, reject) => {
            jwt.verify(
                idToken,
                (header, callback) => this.getKey(header, callback),
                {
                    audience: audience, // Your app's client ID
                    issuer: ['https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0', 
                             'https://login.microsoftonline.com/common/v2.0'],
                    algorithms: ['RS256']
                },
                (err, decoded) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(decoded);
                    }
                }
            );
        });
    }
}

// Create singleton instance
const microsoftVerifier = new MicrosoftTokenVerifier();

export default microsoftVerifier;
