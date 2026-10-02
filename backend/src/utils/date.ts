// ─────────────────────────────────────────────────────────────────────────────
// Date Utilities
//
// All financial date calculations for Hosmos billing live here.
// These are pure functions with no side effects — easy to unit test.
//
// IMPORTANT: Dates are always handled as calendar dates (no time zone shifting).
// All inputs/outputs use ISO 8601 date strings ("YYYY-MM-DD") or JS Date objects.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the number of days in a given month/year.
 * Correctly handles leap years.
 */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of next month = last day of current month
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates prorated rent for the admission month.
 *
 * Formula:
 *   days_applicable = days_in_month - (admission_day - 1)
 *   prorated = ROUND_HALF_UP((monthly_amount / days_in_month) * days_applicable)
 *
 * Example:
 *   Admission Oct 15, monthly = 270000 paise (₹2700), 31-day month
 *   days_applicable = 31 - 14 = 17
 *   prorated = ROUND(270000 / 31 * 17) = ROUND(148064.516...) = 148065 paise
 */
export function calculateProratedRentPaise(
  admissionDate: Date,
  monthlyAmountPaise: number
): number {
  const year = admissionDate.getFullYear();
  const month = admissionDate.getMonth() + 1; // getMonth() is 0-indexed
  const day = admissionDate.getDate();

  const totalDays = daysInMonth(year, month);
  const daysApplicable = totalDays - (day - 1);

  // Round half up to nearest integer paise
  return roundHalfUp((monthlyAmountPaise / totalDays) * daysApplicable);
}

/**
 * Returns true if the admission date falls on the 1st of the month
 * (meaning no proration needed — full month is billed).
 */
export function isFirstOfMonth(date: Date): boolean {
  return date.getDate() === 1;
}

/**
 * Returns the next N months from a given year/month as (year, month) pairs.
 * Used to calculate advance rent allocation periods.
 *
 * Example:
 *   getNextNMonths(2026, 10, 3) → [{ year: 2026, month: 11 }, { year: 2026, month: 12 }, { year: 2027, month: 1 }]
 */
export function getNextNMonths(
  year: number,
  month: number,
  n: number
): Array<{ year: number; month: number }> {
  const result: Array<{ year: number; month: number }> = [];
  let currentYear = year;
  let currentMonth = month;

  for (let i = 0; i < n; i++) {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    result.push({ year: currentYear, month: currentMonth });
  }

  return result;
}

/**
 * Returns the billing period (year, month) for a given date.
 * The billing period is the calendar month of the date.
 */
export function getBillingPeriod(date: Date): { year: number; month: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

/**
 * Returns a human-readable month name for display.
 * Example: monthName(2026, 10) → "October 2026"
 */
export function monthName(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

/**
 * Parses an ISO date string ("YYYY-MM-DD") to a Date object.
 * Treats the date as local midnight (not UTC) to avoid timezone shift issues.
 */
export function parseLocalDate(isoDateString: string): Date {
  const parts = isoDateString.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid ISO date string: ${isoDateString}`);
  }
  const [yearStr, monthStr, dayStr] = parts;
  if (!yearStr || !monthStr || !dayStr) {
    throw new Error(`Invalid ISO date string: ${isoDateString}`);
  }
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Invalid ISO date string: ${isoDateString}`);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid ISO date string: ${isoDateString}`);
  }
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date object as an ISO date string ("YYYY-MM-DD").
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Round a floating-point number to the nearest integer using "round half up" strategy.
 * This is the standard rounding used for all paise calculations.
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Returns true if two (year, month) pairs represent the same billing period.
 */
export function isSamePeriod(
  a: { year: number; month: number },
  b: { year: number; month: number }
): boolean {
  return a.year === b.year && a.month === b.month;
}
