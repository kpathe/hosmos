import type { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.js";
import { env } from "../../config/env.js";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller
// ─────────────────────────────────────────────────────────────────────────────

function setRefreshCookie(res: Response, token: string) {
  res.cookie("hosmos_refresh_token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN,
    maxAge: env.JWT_REFRESH_EXPIRY_SECONDS * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie("hosmos_refresh_token", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN,
  });
}

export const authController = {
  loginOwner: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginOwner(req.body);
      setRefreshCookie(res, result.rawRefreshToken);
      // Remove raw token from response body
      const { rawRefreshToken, ...responseBody } = result;
      res.json({ data: responseBody });
    } catch (error) {
      next(error);
    }
  },

  loginManager: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginManager(req.body);
      setRefreshCookie(res, result.rawRefreshToken);
      const { rawRefreshToken, ...responseBody } = result;
      res.json({ data: responseBody });
    } catch (error) {
      next(error);
    }
  },

  loginHosteller: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginHosteller(req.body);
      setRefreshCookie(res, result.rawRefreshToken);
      const { rawRefreshToken, ...responseBody } = result;
      res.json({ data: responseBody });
    } catch (error) {
      next(error);
    }
  },

  registerHosteller: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.registerHosteller(req.body);
      res.status(201).json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawToken = req.cookies?.hosmos_refresh_token;
      if (!rawToken) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No refresh token provided" } });
        return;
      }

      const result = await authService.refreshTokens(rawToken);
      setRefreshCookie(res, result.rawRefreshToken);
      const { rawRefreshToken, ...responseBody } = result;
      res.json({ data: responseBody });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawToken = req.cookies?.hosmos_refresh_token;
      if (rawToken) {
        await authService.logout(rawToken);
      }
      clearRefreshCookie(res);
      res.json({ data: { success: true } });
    } catch (error) {
      // Even if it fails, clear the cookie
      clearRefreshCookie(res);
      next(error);
    }
  },

  changePassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User must be authenticated to change password
      // The auth middleware injects req.user
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
        return;
      }

      await authService.changePassword(req.user.sub, req.user.role, req.body);
      
      // We revoke refresh tokens on password change, so we must clear the cookie
      clearRefreshCookie(res);
      res.json({ data: { success: true, message: "Password changed successfully. Please log in again." } });
    } catch (error) {
      next(error);
    }
  },
};
