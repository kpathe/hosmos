import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app/app.js";
import { hostelsService } from "../hostels.service.js";
import { signAccessToken } from "../../../utils/crypto.js";

vi.mock("../hostels.service.js", () => ({
  hostelsService: {
    createHostel: vi.fn(),
    getHostelsByOwner: vi.fn(),
    getHostelById: vi.fn(),
  },
}));

vi.mock("../../../middlewares/rate-limit.middleware.js", () => ({
  generalApiLimiter: (req: any, res: any, next: any) => next(),
  authLoginLimiter: (req: any, res: any, next: any) => next(),
  authRegisterLimiter: (req: any, res: any, next: any) => next(),
  authRefreshLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Hostels API", () => {
  const app = createApp();
  const validToken = signAccessToken({ sub: "owner-1", email: "test@test.com", role: "owner" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/hostels", () => {
    it("should create a hostel successfully", async () => {
      vi.mocked(hostelsService.createHostel).mockResolvedValue({ id: "hostel-1", name: "My Hostel" } as any);

      const res = await request(app)
        .post("/api/v1/hostels")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "My Hostel",
          address: "123 Street",
          phone: "9999999999",
          email: "contact@hostel.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe("hostel-1");
    });

  });

  describe("GET /api/v1/hostels", () => {
    it("should get list of hostels", async () => {
      vi.mocked(hostelsService.getHostelsByOwner).mockResolvedValue([{ id: "hostel-1", name: "My Hostel" }] as any);

      const res = await request(app)
        .get("/api/v1/hostels")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/hostels/:id", () => {
    it("should get a single hostel", async () => {
      vi.mocked(hostelsService.getHostelById).mockResolvedValue({ id: "hostel-1", name: "My Hostel" } as any);

      const res = await request(app)
        .get("/api/v1/hostels/hostel-1")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("My Hostel");
    });
  });
});
