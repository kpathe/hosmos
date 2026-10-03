import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL Connection Pool
// ─────────────────────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings
  max: env.NODE_ENV === "production" ? 20 : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Log pool errors (never crash the process on idle connection errors)
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle ORM Instance
// ─────────────────────────────────────────────────────────────────────────────

export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tests database connectivity. Used during server startup.
 * Throws if the database is unreachable.
 */
export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes the connection pool.
 * Called during server shutdown.
 */
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}
