/**
 * Owner Seed Script
 *
 * Creates an owner account via CLI for MVP bootstrapping.
 * Run with: npm run seed:owner
 *
 * Usage:
 *   OWNER_NAME="John Doe" OWNER_EMAIL="john@hosmos.com" OWNER_PASSWORD="ChangeMe123!" npm run seed:owner
 *
 * Or set values directly below (not recommended for production).
 */

import { db, closeDatabaseConnection } from "../index.js";
import { owners } from "../schema/index.js";
import { hashPassword } from "../../utils/crypto.js";

const name = process.env["OWNER_NAME"] ?? "Hostel Owner";
const email = process.env["OWNER_EMAIL"];
const password = process.env["OWNER_PASSWORD"];

if (!email || !password) {
  console.error(
    "❌ OWNER_EMAIL and OWNER_PASSWORD environment variables are required.\n" +
      "Usage: OWNER_EMAIL=admin@example.com OWNER_PASSWORD=SecurePass123! npm run seed:owner"
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("❌ OWNER_PASSWORD must be at least 8 characters");
  process.exit(1);
}

console.log(`\n🌱 Creating owner account...`);
console.log(`   Name:  ${name}`);
console.log(`   Email: ${email}`);

try {
  const passwordHash = await hashPassword(password);

  const [owner] = await db
    .insert(owners)
    .values({
      name,
      email,
      passwordHash,
      mustChangePassword: false,
    })
    .returning({ id: owners.id, email: owners.email });

  console.log(`\n✅ Owner account created successfully!`);
  console.log(`   ID:    ${owner?.id ?? "unknown"}`);
  console.log(`   Email: ${owner?.email ?? "unknown"}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Log in at /admin/login with this email and password`);
  console.log(`   2. Create your hostel via the admin dashboard`);
  console.log(`   3. Configure rooms and pricing models`);
} catch (error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  ) {
    console.error(`❌ An owner with email "${email}" already exists`);
  } else {
    console.error("❌ Failed to create owner:", error);
  }
  process.exit(1);
} finally {
  await closeDatabaseConnection();
}
