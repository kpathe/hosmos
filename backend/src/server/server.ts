import { createApp } from "../app/app.js";
import { env } from "../config/env.js";
import { checkDatabaseConnection, closeDatabaseConnection } from "../db/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function startServer(): Promise<void> {
  // 1. Verify database is reachable before accepting traffic
  try {
    await checkDatabaseConnection();
    console.log("✅ Database connection verified");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1);
  }

  // 2. Create Express app
  const app = createApp();

  // 3. Start HTTP server
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Hosmos API server running on port ${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
  });

  // 4. Graceful shutdown
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\n⏳ ${signal} received — shutting down gracefully...`);

    server.close(async () => {
      console.log("✅ HTTP server closed");

      try {
        await closeDatabaseConnection();
        console.log("✅ Database connections closed");
      } catch (error) {
        console.error("Error closing database connections:", error);
      }

      process.exit(0);
    });

    // Force shutdown after 30s if graceful shutdown hangs
    setTimeout(() => {
      console.error("❌ Forced shutdown after 30s timeout");
      process.exit(1);
    }, 30_000);
  };

  process.on("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
  process.on("SIGINT", () => { void gracefulShutdown("SIGINT"); });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
    // Don't crash in development; crash in production so the process manager restarts
    if (env.NODE_ENV === "production") {
      process.exit(1);
    }
  });
}

await startServer();
