import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, closeDatabaseConnection } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "migrations");

async function runMigrations(): Promise<void> {
  console.log("🔄 Running database migrations...");

  try {
    await migrate(db, { migrationsFolder });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

await runMigrations();
