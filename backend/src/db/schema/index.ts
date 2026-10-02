// ─────────────────────────────────────────────────────────────────────────────
// Database Schema Index
//
// All Drizzle table definitions exported from a single entry point.
// Drizzle Kit uses this file as the schema source (configured in drizzle.config.ts).
// The db/index.ts imports this for the ORM schema type.
// ─────────────────────────────────────────────────────────────────────────────

// Core tenant hierarchy
export * from "./owners.js";
export * from "./hostels.js";
export * from "./managers.js";
export * from "./pricing-models.js";
export * from "./rooms.js";
export * from "./hostellers.js";

// Occupancy and rooms
export * from "./room-occupancies.js";

// Financial
export * from "./bills.js";
export * from "./payments.js";
export * from "./advance-rent-allocations.js";
export * from "./security-deposits.js";

// Electricity
export * from "./meter-readings.js";

// Authentication
export * from "./refresh-tokens.js";
