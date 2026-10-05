import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL Connection Pool — tuned for Neon serverless
//
// Neon auto-suspends compute after ~5 minutes of inactivity. When it wakes,
// any existing TCP connections in the pool are terminated by the network layer.
// pg.Pool doesn't detect stale connections until it tries to query them, which
// produces "Connection terminated due to connection timeout".
//
// Mitigations applied here:
//   1. Small pool size (1 in dev, 3 in prod) — fewer stale connections to clean up.
//   2. Short idleTimeoutMillis (20s) — pool evicts idle connections before Neon
//      autosuspend kills them (Neon's default suspend is 300s / 5 min).
//   3. Short connectionTimeoutMillis (10s) — fast failure instead of hanging.
//   4. keepAlive + keepAliveInitialDelayMillis — TCP keepalive probes so the
//      OS detects dead connections faster (OS-level, not application-level).
//   5. Periodic pool ping — sends a lightweight SELECT 1 every 4 minutes to
//      keep the Neon compute warm and evict connections that have gone stale.
// ─────────────────────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === "production" ? 3 : 1,   // keep it small for serverless
  min: 0,                                         // don't hold connections when idle
  idleTimeoutMillis: 20_000,                      // evict idle connections after 20s
  connectionTimeoutMillis: 10_000,                // fail fast if Neon is sleeping
  ssl: { rejectUnauthorized: false },
});

// ── Pool-level error handler ──────────────────────────────────────────────────
// Prevents unhandled rejection crashes on stale connection errors.
pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error (stale connection evicted):", err.message);
});

// ── Periodic keep-alive ping ──────────────────────────────────────────────────
// Keeps the Neon compute awake and detects stale connections proactively.
// Runs every 4 minutes — just under Neon's 5-minute autosuspend window.
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

function startKeepalive() {
  const interval = setInterval(async () => {
    let client: pg.PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query("SELECT 1");
    } catch (err: any) {
      // Non-fatal — pool will recover on the next real query
      console.warn("[DB] Keepalive ping failed (Neon may be waking up):", err.message);
    } finally {
      client?.release();
    }
  }, KEEPALIVE_INTERVAL_MS);

  // Don't hold the Node.js process open just for keepalive
  interval.unref();
}

// Only run keepalive when there's a real database (not in test environment)
if (env.NODE_ENV !== "test") {
  startKeepalive();
}

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
