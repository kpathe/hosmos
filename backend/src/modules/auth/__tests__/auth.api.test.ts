import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app/app.js";
import { authService } from "../auth.service.js";
import { signAccessToken } from "../../../utils/crypto.js";

// Mock the authentication service so we don't hit the real database
vi.mock("../auth.service.js", () => ({
  authService: {
    loginOwner: vi.fn(),
    refreshTokens: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  },
}));

// Mock rate limiting to avoid interference during tests
vi.mock("../../../middlewares/rate-limit.middleware.js", () => ({
  generalApiLimiter: (req: any, res: any, next: any) => next(),
  authLoginLimiter: (req: any, res: any, next: any) => next(),
  authRegisterLimiter: (req: any, res: any, next: any) => next(),
  authRefreshLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Authentication API", () => {
  const app = createApp();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/login/owner", () => {
    it("should return access token and set refresh token cookie on successful login", async () => {
      // Setup the mock response
      vi.mocked(authService.loginOwner).mockResolvedValue({
        accessToken: "mocked_access_token",
        rawRefreshToken: "mocked_raw_refresh_token",
        user: { id: "user-123", name: "Test Owner", email: "owner@test.com", role: "owner" },
      });

      const response = await request(app)
        .post("/api/v1/auth/login/owner")
        .send({
          email: "owner@test.com",
          password_plain: "correct_password",
        });

      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBe("mocked_access_token");
      expect(response.body.data.user.id).toBe("user-123");
      
      // Verify the HTTP-Only cookie was set
      const setCookieHeader = response.headers["set-cookie"];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toMatch(/hosmos_refresh_token=mocked_raw_refresh_token/);
      expect(setCookieHeader[0]).toMatch(/HttpOnly/);
    });

    it("should return 400 for invalid request body", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login/owner")
        .send({
          email: "not-an-email",
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Token Refresh Flow (POST /api/v1/auth/refresh)", () => {
    it("should fail if no refresh token cookie is provided", async () => {
      const response = await request(app).post("/api/v1/auth/refresh");
      
      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain("No refresh token provided");
    });

    it("should return a new access token and rotate the refresh cookie", async () => {
      vi.mocked(authService.refreshTokens).mockResolvedValue({
        accessToken: "new_access_token",
        rawRefreshToken: "new_rotated_refresh_token",
        user: { id: "user-123", name: "Test Owner", email: "owner@test.com", role: "owner" },
      });

      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", "hosmos_refresh_token=old_valid_refresh_token");

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBe("new_access_token");
      
      // Verify the cookie was rotated
      const setCookieHeader = response.headers["set-cookie"];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toMatch(/hosmos_refresh_token=new_rotated_refresh_token/);
    });
  });

  describe("Protected Routes & requireAuth Middleware", () => {
    // Generate a valid JWT for testing the middleware
    const validToken = signAccessToken({
      sub: "user-123",
      email: "owner@test.com",
      role: "owner",
    });

    it("should deny access if Authorization header is missing", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .send({
          old_password_plain: "old",
          new_password_plain: "new_password",
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
      expect(response.body.error.message).toBe("Missing or malformed Authorization header");
    });

    it("should deny access if Authorization header is malformed", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `InvalidScheme ${validToken}`)
        .send({
          old_password_plain: "old",
          new_password_plain: "new_password",
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe("Missing or malformed Authorization header");
    });

    it("should allow access if a valid Bearer token is provided", async () => {
      vi.mocked(authService.changePassword).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          old_password_plain: "old",
          new_password_plain: "new_password",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
      
      // Also verify that it clears the refresh cookie as a security measure
      const setCookieHeader = response.headers["set-cookie"];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toMatch(/hosmos_refresh_token=;/);
    });
  });
});
