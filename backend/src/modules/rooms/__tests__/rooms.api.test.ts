import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app/app.js";
import { roomsService } from "../rooms.service.js";
import { signAccessToken } from "../../../utils/crypto.js";

vi.mock("../rooms.service.js", () => ({
  roomsService: {
    createRoom: vi.fn(),
    getRoomsByHostel: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

vi.mock("../../../middlewares/rate-limit.middleware.js", () => ({
  generalApiLimiter: (req: any, res: any, next: any) => next(),
  authLoginLimiter: (req: any, res: any, next: any) => next(),
  authRegisterLimiter: (req: any, res: any, next: any) => next(),
  authRefreshLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Rooms API", () => {
  const app = createApp();
  const validToken = signAccessToken({ sub: "owner-1", email: "test@test.com", role: "owner" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/rooms", () => {
    it("should create room", async () => {
      vi.mocked(roomsService.createRoom).mockResolvedValue({ id: "room-1", room_number: "101" } as any);

      const res = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1")
        .send({
          room_number: "101",
          floor: 1,
          capacity: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.room_number).toBe("101");
    });
  });

  describe("GET /api/v1/rooms", () => {
    it("should list rooms", async () => {
      vi.mocked(roomsService.getRoomsByHostel).mockResolvedValue([] as any);

      const res = await request(app)
        .get("/api/v1/rooms")
        .set("Authorization", `Bearer ${validToken}`)
        .set("x-hostel-id", "hostel-1");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
