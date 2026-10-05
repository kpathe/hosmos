// ─────────────────────────────────────────────────────────────────────────────
// Drizzle Relations
//
// Required for db.query.*  (relational query API / findMany with: {}).
// Every table that uses .with() in a service MUST have a relations() entry here.
// ─────────────────────────────────────────────────────────────────────────────

import { relations } from "drizzle-orm";
import { owners } from "./owners.js";
import { hostels } from "./hostels.js";
import { managers, hostelManagers } from "./managers.js";
import { rooms } from "./rooms.js";
import { pricingModels } from "./pricing-models.js";
import { hostellers } from "./hostellers.js";
import { roomOccupancies } from "./room-occupancies.js";
import { bills, billItems } from "./bills.js";
import { payments } from "./payments.js";
import { securityDeposits } from "./security-deposits.js";
import { meterReadings } from "./meter-readings.js";
import { refreshTokens } from "./refresh-tokens.js";

// ─── Owners ──────────────────────────────────────────────────────────────────

export const ownersRelations = relations(owners, ({ many }) => ({
  hostels: many(hostels),
}));

// ─── Hostels ─────────────────────────────────────────────────────────────────

export const hostelsRelations = relations(hostels, ({ one, many }) => ({
  owner: one(owners, { fields: [hostels.ownerId], references: [owners.id] }),
  rooms: many(rooms),
  hostelManagers: many(hostelManagers),
  pricingModels: many(pricingModels),
  hostellers: many(hostellers),
}));

// ─── Managers ────────────────────────────────────────────────────────────────

export const managersRelations = relations(managers, ({ many }) => ({
  hostelManagers: many(hostelManagers),
}));

export const hostelManagersRelations = relations(hostelManagers, ({ one }) => ({
  hostel: one(hostels, { fields: [hostelManagers.hostelId], references: [hostels.id] }),
  manager: one(managers, { fields: [hostelManagers.managerId], references: [managers.id] }),
}));

// ─── Pricing Models ──────────────────────────────────────────────────────────

export const pricingModelsRelations = relations(pricingModels, ({ one, many }) => ({
  hostel: one(hostels, { fields: [pricingModels.hostelId], references: [hostels.id] }),
  rooms: many(rooms),
}));

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  hostel: one(hostels, { fields: [rooms.hostelId], references: [hostels.id] }),
  pricingModel: one(pricingModels, {
    fields: [rooms.pricingModelId],
    references: [pricingModels.id],
  }),
  occupancies: many(roomOccupancies),
}));

// ─── Hostellers ──────────────────────────────────────────────────────────────

export const hostellersRelations = relations(hostellers, ({ one, many }) => ({
  hostel: one(hostels, { fields: [hostellers.hostelId], references: [hostels.id] }),
  roomOccupancies: many(roomOccupancies),
  bills: many(bills),
  payments: many(payments),
  securityDeposits: many(securityDeposits),
}));

// ─── Room Occupancies ─────────────────────────────────────────────────────────

export const roomOccupanciesRelations = relations(roomOccupancies, ({ one }) => ({
  hostel: one(hostels, { fields: [roomOccupancies.hostelId], references: [hostels.id] }),
  room: one(rooms, { fields: [roomOccupancies.roomId], references: [rooms.id] }),
  hosteller: one(hostellers, {
    fields: [roomOccupancies.hostelerId],   // hostelerId (not hostellerId) — schema column name
    references: [hostellers.id],
  }),
}));

// ─── Bills ───────────────────────────────────────────────────────────────────

export const billsRelations = relations(bills, ({ one, many }) => ({
  hostel: one(hostels, { fields: [bills.hostelId], references: [hostels.id] }),
  hosteller: one(hostellers, {
    fields: [bills.hostelerId],             // hostelerId (schema column name)
    references: [hostellers.id],
  }),
  billItems: many(billItems),
  payments: many(payments),
}));

// ─── Bill Items ───────────────────────────────────────────────────────────────

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, { fields: [billItems.billId], references: [bills.id] }),
  hostel: one(hostels, { fields: [billItems.hostelId], references: [hostels.id] }),
}));

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one }) => ({
  hostel: one(hostels, { fields: [payments.hostelId], references: [hostels.id] }),
  hosteller: one(hostellers, {
    fields: [payments.hostelerId],          // hostelerId (schema column name)
    references: [hostellers.id],
  }),
  bill: one(bills, { fields: [payments.billId], references: [bills.id] }),
}));

// ─── Security Deposits ────────────────────────────────────────────────────────

export const securityDepositsRelations = relations(securityDeposits, ({ one }) => ({
  hostel: one(hostels, { fields: [securityDeposits.hostelId], references: [hostels.id] }),
  hosteller: one(hostellers, {
    fields: [securityDeposits.hostelerId],  // hostelerId (schema column name)
    references: [hostellers.id],
  }),
}));

// ─── Meter Readings ───────────────────────────────────────────────────────────

export const meterReadingsRelations = relations(meterReadings, ({ one }) => ({
  hostel: one(hostels, { fields: [meterReadings.hostelId], references: [hostels.id] }),
  room: one(rooms, { fields: [meterReadings.roomId], references: [rooms.id] }),
}));
