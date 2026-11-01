import { z } from "zod";
import { config } from "dotenv";

// Load .env file in non-production environments
config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters (256 bits recommended)"),
  JWT_ACCESS_EXPIRY_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_EXPIRY_SECONDS: z.coerce.number().int().positive().default(2592000),

  BCRYPT_COST_FACTOR: z.coerce.number().int().min(10).max(20).default(12),

  AADHAAR_ENCRYPTION_KEY: z
    .string()
    .length(64, "AADHAAR_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)"),

  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  COOKIE_DOMAIN: z.string().default("localhost"),

  // SMTP Email Settings (optional; logs to console if omitted)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.trim().toLowerCase() === "true" || val.trim() === "1";
      return false;
    }),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("Hosmos <noreply@hosmos.com>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Derived helpers
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

export const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim());
