// ─────────────────────────────────────────────────────────────────────────────
// Currency Utilities
//
// All monetary amounts in the database are stored as integer paise (1 paise = ₹0.01).
// Conversions between paise and rupees happen ONLY at the presentation layer.
//
// NEVER use floating-point arithmetic on monetary values.
// ALWAYS use integer paise for calculations.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a rupee amount (float) to integer paise.
 * Use only when accepting user input (e.g., "₹2700" → 270000 paise).
 * Rounds to the nearest paise.
 *
 * @example rupeesToPaise(2700)   → 270000
 * @example rupeesToPaise(2700.5) → 270050
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise to rupees as a number.
 * Use only for display/response formatting.
 *
 * @example paiseToRupees(270000) → 2700
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats paise as a human-readable rupee string with the ₹ symbol.
 * Always shows 2 decimal places.
 *
 * @example formatRupees(270000) → "₹2,700.00"
 * @example formatRupees(148065) → "₹1,480.65"
 * @example formatRupees(-50000) → "-₹500.00"
 */
export function formatRupees(paise: number): string {
  const isNegative = paise < 0;
  const absRupees = Math.abs(paise) / 100;
  const formatted = absRupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Validates that a paise amount is a valid positive integer.
 * Use before persisting any financial value.
 */
export function isValidPaise(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0;
}

/**
 * Validates that a paise amount is a valid non-zero positive integer.
 */
export function isValidPositivePaise(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/**
 * Calculates per-occupant electricity share (equal division).
 * Any remainder paise is added to the first occupant's share.
 *
 * @param totalCostPaise - Total electricity cost in paise
 * @param occupantCount  - Number of occupants sharing the cost
 * @returns Array of paise amounts, one per occupant (index 0 absorbs remainder)
 */
export function splitElectricityCost(
  totalCostPaise: number,
  occupantCount: number
): number[] {
  if (occupantCount <= 0) return [];
  if (occupantCount === 1) return [totalCostPaise];

  const baseShare = Math.floor(totalCostPaise / occupantCount);
  const remainder = totalCostPaise - baseShare * occupantCount;

  const shares = Array(occupantCount).fill(baseShare) as number[];
  // First occupant absorbs any remainder paise (at most occupantCount-1 paise difference)
  shares[0] = (shares[0] ?? 0) + remainder;

  return shares;
}
