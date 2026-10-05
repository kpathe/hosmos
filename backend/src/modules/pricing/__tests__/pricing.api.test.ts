import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app/app.js";
import { pricingService } from "../pricing.service.js";
import { signAccessToken } from "../../../utils/crypto.js";

vi.mock("../pricing.service.js", () => ({
  pricingService: {
    createPricingModel: vi.fn(),
    getPricingModelsByHostel: vi.fn(),
    updatePricingModel: vi.fn(),
    deletePricingModel: vi.fn(),
  },
}));

vi.mock("../../../middlewares/rate-limit.middleware.js", () => ({
  generalApiLimiter: (req: any, res: any, next: any) => next(),
  authLoginLimiter: (req: any, res: any, next: any) => next(),
  authRegisterLimiter: (req: any, res: any, next: any) => next(),
  authRefreshLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Pricing API", () => {
  const app = createApp();
  const validToken = signAccessToken({ sub: "owner-1", email: "test@test.com", role: "owner" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/pricing", () => {
    it("should create pricing model", async () => {
      vi.mocked(pricingService.createPricingModel).mockResolvedValue({ id: "pricing-1", name: "Standard" } as any);

      const res = await request(app)
        .post("/api/v1/pricing")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1")
        .send({
          name: "Standard",
          monthly_amount_paise: 500000,
          charging_basis: "PER_SEAT",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Standard");
    });

    it("should enforce x-hostel-id middleware", async () => {
      const res = await request(app)
        .post("/api/v1/pricing")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Standard",
          monthly_amount_paise: 500000,
          charging_basis: "PER_SEAT",
        });
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Missing X-Hostel-Id header");
    });
  });

  describe("GET /api/v1/pricing", () => {
    it("should list pricing models", async () => {
      vi.mocked(pricingService.getPricingModelsByHostel).mockResolvedValue([] as any);

      const res = await request(app)
        .get("/api/v1/pricing")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
