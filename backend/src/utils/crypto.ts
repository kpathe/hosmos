import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { jwtConfig, type JwtPayload } from "../config/jwt.js";
import { AuthenticationError } from "./errors.js";

// ─────────────────────────────────────────────────────────────────────────────
// Password Hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hashes a plaintext password using bcrypt.
 * Cost factor is read from environment config (min 10, default 12).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_COST_FACTOR);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * Returns true if they match.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Token Generation and Hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random refresh token.
 * Returns a 64-character hex string (32 bytes of entropy).
 * This raw token is sent to the client via HttpOnly cookie.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a raw refresh token using SHA-256 for database storage.
 * NEVER store the raw token in the database.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP Generation and Hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random 6-digit numeric OTP (100000-999999).
 */
export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP using SHA-256 for secure database storage.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signs a new JWT access token with the given payload.
 * Expiry is controlled by JWT_ACCESS_EXPIRY_SECONDS environment variable.
 */
export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessExpirySeconds,
  });
}

/**
 * Verifies and decodes a JWT access token.
 * Throws AuthenticationError if invalid or expired.
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    return decoded as JwtPayload;
  } catch {
    throw new AuthenticationError("Invalid or expired access token");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Aadhaar Encryption (AES-256-GCM)
// ─────────────────────────────────────────────────────────────────────────────

const AADHAAR_KEY = Buffer.from(env.AADHAAR_ENCRYPTION_KEY, "hex");
const GCM_IV_LENGTH = 12; // 96 bits (recommended for GCM)
const GCM_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypts an Aadhaar number using AES-256-GCM.
 * Returns a base64-encoded string: IV:CIPHERTEXT:AUTHTAG
 */
export function encryptAadhaar(plaintext: string): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", AADHAAR_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Store as base64(iv):base64(ciphertext):base64(tag)
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

/**
 * Decrypts an Aadhaar number encrypted with encryptAadhaar().
 * Throws if decryption fails (tampered data or wrong key).
 */
export function decryptAadhaar(encrypted: string): string {
  const [ivB64, ciphertextB64, tagB64] = encrypted.split(":");

  if (!ivB64 || !ciphertextB64 || !tagB64) {
    throw new Error("Invalid encrypted Aadhaar format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", AADHAAR_KEY, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

/**
 * Returns a masked Aadhaar display string showing only the last 4 digits.
 * Format: "XXXX-XXXX-1234"
 * Input can be either the encrypted string or plain digits.
 */
export function maskAadhaar(encryptedOrPlain: string, isEncrypted = true): string {
  let digits: string;
  if (isEncrypted) {
    digits = decryptAadhaar(encryptedOrPlain).replace(/\D/g, "");
  } else {
    digits = encryptedOrPlain.replace(/\D/g, "");
  }
  const last4 = digits.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Record Number Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a human-readable payment record number.
 * Format: PMT-YYYYMMDD-XXXXX (e.g., PMT-20261015-A3F2B)
 */
export function generateRecordNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PMT-${datePart}-${randomPart}`;
}
