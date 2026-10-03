// ─────────────────────────────────────────────────────────────────────────────
// Database Schema Index
//
// All Drizzle table definitions exported from a single entry point.
// Drizzle Kit uses this file as the schema source (configured in drizzle.config.ts).
// The db/index.ts imports this for the ORM schema type.
// ─────────────────────────────────────────────────────────────────────────────

// Core tenant hierarchy
// Core tenant hierarchy
export * from "./owners";
export * from "./hostels";
export * from "./managers";
export * from "./pricing-models";
export * from "./rooms";
export * from "./hostellers";

// Occupancy and rooms
export * from "./room-occupancies";

// Financial
export * from "./bills";
export * from "./payments";
export * from "./advance-rent-allocations";
export * from "./security-deposits";

// Electricity
export * from "./meter-readings";

// Authentication
export * from "./refresh-tokens";
