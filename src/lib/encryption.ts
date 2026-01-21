import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }

  // If key is hex-encoded (64 characters), decode it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // Otherwise, use the key directly (must be 32 bytes)
  const keyBuffer = Buffer.from(key, 'utf-8');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (or 64 hex characters)');
  }

  return keyBuffer;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns base64-encoded ciphertext with IV and auth tag prepended
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext string encrypted with encrypt()
 * Expects base64-encoded input with IV and auth tag prepended
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const combined = Buffer.from(ciphertext, 'base64');

  // Extract IV, authTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Mask a secret value for display
 * Shows first 7 and last 4 characters with **** in between
 */
export function maskSecret(value: string): string {
  if (!value || value.length <= 12) {
    return '****';
  }

  const prefix = value.substring(0, 7);
  const suffix = value.substring(value.length - 4);

  return `${prefix}****${suffix}`;
}

/**
 * Generate a random encryption key (for .env setup)
 * Returns a 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
