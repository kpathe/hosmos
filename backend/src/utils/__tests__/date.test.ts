import { describe, it, expect } from "vitest";
import {
  calculateProratedRentPaise,
  daysInMonth,
  getNextNMonths,
  getBillingPeriod,
  isFirstOfMonth,
  isSamePeriod,
  parseLocalDate,
  formatLocalDate,
  roundHalfUp,
} from "../../utils/date.js";

// ─────────────────────────────────────────────────────────────────────────────
// daysInMonth
// ─────────────────────────────────────────────────────────────────────────────

describe("daysInMonth", () => {
  it("returns 31 for January", () => expect(daysInMonth(2026, 1)).toBe(31));
  it("returns 28 for February in a non-leap year", () => expect(daysInMonth(2025, 2)).toBe(28));
  it("returns 29 for February in a leap year", () => expect(daysInMonth(2024, 2)).toBe(29));
  it("returns 30 for April", () => expect(daysInMonth(2026, 4)).toBe(30));
  it("returns 31 for October", () => expect(daysInMonth(2026, 10)).toBe(31));
  it("returns 31 for December", () => expect(daysInMonth(2026, 12)).toBe(31));
});

// ─────────────────────────────────────────────────────────────────────────────
// roundHalfUp
// ─────────────────────────────────────────────────────────────────────────────

describe("roundHalfUp", () => {
  it("rounds 0.4 down to 0", () => expect(roundHalfUp(0.4)).toBe(0));
  it("rounds 0.5 up to 1", () => expect(roundHalfUp(0.5)).toBe(1));
  it("rounds 0.6 up to 1", () => expect(roundHalfUp(0.6)).toBe(1));
  it("rounds 148064.516 to 148065", () => expect(roundHalfUp(148064.516)).toBe(148065));
  it("handles exact integers", () => expect(roundHalfUp(270000)).toBe(270000));
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateProratedRentPaise — The critical billing calculation
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateProratedRentPaise", () => {
  const MONTHLY = 270000; // ₹2700 in paise

  it("PRD example: Oct 15 admission → 17 days out of 31", () => {
    const date = new Date(2026, 9, 15); // Oct 15, 2026
    // days_applicable = 31 - 14 = 17
    // prorated = round(270000 / 31 * 17) = round(148064.516) = 148065
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(148065);
  });

  it("admission on the 1st → full month rent", () => {
    const date = new Date(2026, 9, 1); // Oct 1
    // days_applicable = 31
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(MONTHLY);
  });

  it("admission on the last day of month → 1 day rent", () => {
    const date = new Date(2026, 9, 31); // Oct 31
    // days_applicable = 1
    // prorated = round(270000 / 31 * 1) = round(8709.67) = 8710
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(8710);
  });

  it("admission on Feb 28 (non-leap year) → 1 day rent", () => {
    const date = new Date(2025, 1, 28); // Feb 28, 2025 (non-leap)
    // days_applicable = 1
    // prorated = round(270000 / 28 * 1) = round(9642.857) = 9643
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(9643);
  });

  it("admission on Feb 29 (leap year) → 1 day rent", () => {
    const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap)
    // days_applicable = 1
    // prorated = round(270000 / 29 * 1) = round(9310.34) = 9310
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(9310);
  });

  it("admission on Feb 1 (non-leap) → full 28-day month", () => {
    const date = new Date(2025, 1, 1);
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(MONTHLY);
  });

  it("admission on Feb 1 (leap) → full 29-day month", () => {
    const date = new Date(2024, 1, 1);
    expect(calculateProratedRentPaise(date, MONTHLY)).toBe(MONTHLY);
  });

  it("result is always an integer (no fractional paise)", () => {
    const date = new Date(2026, 9, 15);
    const result = calculateProratedRentPaise(date, MONTHLY);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("FULL_ROOM pricing: same formula applies (single occupant)", () => {
    const date = new Date(2026, 9, 15);
    const FULL_ROOM_MONTHLY = 680000; // ₹6800
    // prorated = round(680000 / 31 * 17) = round(372903.22) = 372903
    expect(calculateProratedRentPaise(date, FULL_ROOM_MONTHLY)).toBe(372903);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getNextNMonths
// ─────────────────────────────────────────────────────────────────────────────

describe("getNextNMonths", () => {
  it("3 months after October 2026", () => {
    const result = getNextNMonths(2026, 10, 3);
    expect(result).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });

  it("wraps correctly from December", () => {
    const result = getNextNMonths(2026, 12, 2);
    expect(result).toEqual([
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });

  it("returns empty array for n=0", () => {
    expect(getNextNMonths(2026, 10, 0)).toEqual([]);
  });

  it("handles year boundary correctly over many months", () => {
    const result = getNextNMonths(2026, 11, 3);
    expect(result).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBillingPeriod
// ─────────────────────────────────────────────────────────────────────────────

describe("getBillingPeriod", () => {
  it("returns correct year and month for October", () => {
    expect(getBillingPeriod(new Date(2026, 9, 15))).toEqual({ year: 2026, month: 10 });
  });
  it("returns correct year and month for January", () => {
    expect(getBillingPeriod(new Date(2027, 0, 1))).toEqual({ year: 2027, month: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isFirstOfMonth
// ─────────────────────────────────────────────────────────────────────────────

describe("isFirstOfMonth", () => {
  it("returns true for the 1st", () => expect(isFirstOfMonth(new Date(2026, 9, 1))).toBe(true));
  it("returns false for any other day", () => expect(isFirstOfMonth(new Date(2026, 9, 2))).toBe(false));
  it("returns false for the last day", () => expect(isFirstOfMonth(new Date(2026, 9, 31))).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// isSamePeriod
// ─────────────────────────────────────────────────────────────────────────────

describe("isSamePeriod", () => {
  it("matches same year and month", () => {
    expect(isSamePeriod({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(true);
  });
  it("does not match different months", () => {
    expect(isSamePeriod({ year: 2026, month: 10 }, { year: 2026, month: 11 })).toBe(false);
  });
  it("does not match different years", () => {
    expect(isSamePeriod({ year: 2026, month: 10 }, { year: 2027, month: 10 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseLocalDate / formatLocalDate
// ─────────────────────────────────────────────────────────────────────────────

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD correctly", () => {
    const date = parseLocalDate("2026-10-15");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9); // 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it("throws on invalid format", () => {
    expect(() => parseLocalDate("not-a-date")).toThrow();
  });
});

describe("formatLocalDate", () => {
  it("formats date as YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2026, 9, 15))).toBe("2026-10-15");
  });
  it("pads month and day with leading zeros", () => {
    expect(formatLocalDate(new Date(2027, 0, 5))).toBe("2027-01-05");
  });
});
