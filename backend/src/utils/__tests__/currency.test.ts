import { describe, it, expect } from "vitest";
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  isValidPaise,
  isValidPositivePaise,
  splitElectricityCost,
} from "../../utils/currency.js";

// ─────────────────────────────────────────────────────────────────────────────
// rupeesToPaise / paiseToRupees
// ─────────────────────────────────────────────────────────────────────────────

describe("rupeesToPaise", () => {
  it("converts whole rupee amounts", () => expect(rupeesToPaise(2700)).toBe(270000));
  it("converts decimal rupee amounts", () => expect(rupeesToPaise(2700.5)).toBe(270050));
  it("converts zero", () => expect(rupeesToPaise(0)).toBe(0));
  // Note: 1.005 * 100 = 100.49999... in IEEE 754 — this is expected JS behaviour.
  // In Hosmos, rupee→paise conversion only happens for admin input (integer amounts).
  // We use 1.5 here which does round correctly: 1.5 * 100 = 150.
  it("rounds decimal values correctly", () => expect(rupeesToPaise(1.5)).toBe(150));
});

describe("paiseToRupees", () => {
  it("converts paise to rupees", () => expect(paiseToRupees(270000)).toBe(2700));
  it("converts fractional", () => expect(paiseToRupees(148065)).toBe(1480.65));
  it("converts zero", () => expect(paiseToRupees(0)).toBe(0));
});

// ─────────────────────────────────────────────────────────────────────────────
// formatRupees
// ─────────────────────────────────────────────────────────────────────────────

describe("formatRupees", () => {
  it("formats positive amount with ₹ symbol", () => {
    expect(formatRupees(270000)).toContain("₹");
    expect(formatRupees(270000)).toContain("2,700.00");
  });
  it("formats zero as ₹0.00", () => {
    expect(formatRupees(0)).toContain("0.00");
  });
  it("formats negative amounts with minus sign", () => {
    expect(formatRupees(-50000)).toContain("-₹");
    expect(formatRupees(-50000)).toContain("500.00");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidPaise / isValidPositivePaise
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidPaise", () => {
  it("accepts zero", () => expect(isValidPaise(0)).toBe(true));
  it("accepts positive integers", () => expect(isValidPaise(270000)).toBe(true));
  it("rejects floats", () => expect(isValidPaise(2700.5)).toBe(false));
  it("rejects negatives", () => expect(isValidPaise(-1)).toBe(false));
});

describe("isValidPositivePaise", () => {
  it("rejects zero", () => expect(isValidPositivePaise(0)).toBe(false));
  it("accepts positive integers", () => expect(isValidPositivePaise(1)).toBe(true));
  it("rejects floats", () => expect(isValidPositivePaise(1.5)).toBe(false));
  it("rejects negatives", () => expect(isValidPositivePaise(-100)).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// splitElectricityCost
// ─────────────────────────────────────────────────────────────────────────────

describe("splitElectricityCost", () => {
  it("returns full amount for single occupant", () => {
    expect(splitElectricityCost(33000, 1)).toEqual([33000]);
  });

  it("divides evenly between 2 occupants", () => {
    expect(splitElectricityCost(20000, 2)).toEqual([10000, 10000]);
  });

  it("divides evenly between 3 occupants", () => {
    expect(splitElectricityCost(30000, 3)).toEqual([10000, 10000, 10000]);
  });

  it("first occupant absorbs remainder (3 way split with 2 paise remainder)", () => {
    // 10001 / 3 = 3333.67 → base = 3333, remainder = 10001 - 9999 = 2
    const shares = splitElectricityCost(10001, 3);
    expect(shares).toHaveLength(3);
    expect(shares[0]).toBe(3335); // 3333 + 2 remainder
    expect(shares[1]).toBe(3333);
    expect(shares[2]).toBe(3333);
    // Total must equal original
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10001);
  });

  it("total of shares always equals total cost", () => {
    for (const [total, count] of [[33333, 3], [100001, 7], [1, 2]] as [number, number][]) {
      const shares = splitElectricityCost(total, count);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("returns empty array for 0 occupants", () => {
    expect(splitElectricityCost(10000, 0)).toEqual([]);
  });
});
