import crypto from 'crypto';
import { promisify } from 'util';
import { createCipheriv, createDecipheriv, scrypt } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('SMTP_ENCRYPTION_KEY environment variable is not set');
}

// Promisify the scrypt function
const scryptAsync = promisify(scrypt);

/**
 * Derive a key from the master key using a salt
 */
async function deriveKey(salt) {
  return scryptAsync(ENCRYPTION_KEY, salt, KEY_LENGTH, {
    N: ITERATIONS,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024, // 32MB
  });
}

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text in format: salt:iv:tag:ciphertext (base64 encoded)
 */
export async function encryptText(text) {
  if (!text) return '';
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  try {
    // Derive key from master key and salt
    const key = await deriveKey(salt);
    
    // Create cipher instance
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    // Return as base64 string
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts text using AES-256-GCM
 * @param {string} encryptedText - Encrypted text in format: salt:iv:tag:ciphertext (base64 encoded)
 * @returns {string} Decrypted text
 */
export async function decryptText(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    // Convert from base64 to buffer
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extract salt, iv, tag, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive the same key using the salt
    const key = await deriveKey(salt);
    
    // Create decipher instance
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    
    // Set the authentication tag
    decipher.setAuthTag(tag);
    
    // Decrypt the text
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data. The encryption key may be incorrect.');
  }
}

/**
 * Hashes a value (one-way)
 * @param {string} value - Value to hash
 * @returns {Promise<string>} Hashed value
 */
export async function hashValue(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(value, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Verifies a value against a hash
 * @param {string} value - Value to verify
 * @param {string} hash - Hash to verify against (format: salt:hash)
 * @returns {Promise<boolean>} True if the value matches the hash
 */
export async function verifyHash(value, hash) {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = await scryptAsync(value, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}
