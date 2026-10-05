import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app/app.js";
import { admissionsService } from "../admissions.service.js";
import { signAccessToken } from "../../../utils/crypto.js";

vi.mock("../admissions.service.js", () => ({
  admissionsService: {
    admitHosteller: vi.fn(),
  },
}));

vi.mock("../../../middlewares/rate-limit.middleware.js", () => ({
  generalApiLimiter: (req: any, res: any, next: any) => next(),
  authLoginLimiter: (req: any, res: any, next: any) => next(),
  authRegisterLimiter: (req: any, res: any, next: any) => next(),
  authRefreshLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Admissions API", () => {
  const app = createApp();
  const validToken = signAccessToken({ sub: "owner-1", email: "test@test.com", role: "owner" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/admissions", () => {
    it("should process admission", async () => {
      vi.mocked(admissionsService.admitHosteller).mockResolvedValue({ success: true } as any);

      const res = await request(app)
        .post("/api/v1/admissions")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1")
        .send({
          name: "John Doe",
          father_name: "Richard Doe",
          email: "john@example.com",
          phone: "9876543210",
          admission_date: "2026-10-01",
          room_id: "room-1",
          security_deposit_amount_paise: 500000,
          advance_months: 3,
          payment_mode: "upi",
          payment_date: "2026-10-01",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.success).toBe(true);
    });
  });
});
