import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app/app.js";
import { managersService } from "../managers.service.js";
import { signAccessToken } from "../../../utils/crypto.js";

vi.mock("../managers.service.js", () => ({
  managersService: {
    createManager: vi.fn(),
    getManagersByHostel: vi.fn(),
    updateManager: vi.fn(),
    deleteManager: vi.fn(),
  },
}));

vi.mock("../../../middlewares/rate-limit.middleware.js", () => ({
  generalApiLimiter: (req: any, res: any, next: any) => next(),
  authLoginLimiter: (req: any, res: any, next: any) => next(),
  authRegisterLimiter: (req: any, res: any, next: any) => next(),
  authRefreshLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Managers API", () => {
  const app = createApp();
  const validToken = signAccessToken({ sub: "owner-1", email: "test@test.com", role: "owner" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/managers", () => {
    it("should create manager", async () => {
      vi.mocked(managersService.createManager).mockResolvedValue({ id: "mgr-1", name: "Manager One" } as any);

      const res = await request(app)
        .post("/api/v1/managers")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1")
        .send({
          name: "Manager One",
          email: "mgr1@example.com",
          password_plain: "secure_pass",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Manager One");
    });
  });

  describe("GET /api/v1/managers", () => {
    it("should list managers", async () => {
      vi.mocked(managersService.getManagersByHostel).mockResolvedValue([] as any);

      const res = await request(app)
        .get("/api/v1/managers")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
