import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const SESSION_TOKEN_BYTES = 32;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

// Session tokens are high-entropy random values (not low-entropy secrets
// like passwords), so a fast SHA-256 digest is sufficient for at-rest
// storage -- bcrypt's slow hashing is reserved for password storage only.
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
