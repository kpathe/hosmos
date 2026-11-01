import type { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller
// ─────────────────────────────────────────────────────────────────────────────
// The backend now returns the raw refresh token in the JSON body.
// The Next.js frontend proxy intercepts this and sets the secure HttpOnly cookie.
// This completely avoids any CORS/Domain/Proxy Set-Cookie parsing issues.

export const authController = {
  loginOwner: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginOwner(req.body);
      res.json({ data: result }); // Returns access_token, user, and rawRefreshToken
    } catch (error) {
      next(error);
    }
  },

  loginManager: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginManager(req.body);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  loginHosteller: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginHosteller(req.body);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  sendHostellerOtp: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.sendHostellerRegistrationOtp(req.body.email);
      res.json({ data: result });
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
      // The Next.js proxy will send the refresh token in the JSON body
      const rawToken = req.body.refresh_token;
      if (!rawToken) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No refresh token provided" } });
        return;
      }

      const result = await authService.refreshTokens(rawToken);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawToken = req.body.refresh_token;
      if (rawToken) {
        await authService.logout(rawToken);
      }
      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
        return;
      }
      await authService.changePassword(req.user.sub, req.user.role, req.body);
      res.json({ data: { success: true, message: "Password changed successfully. Please log in again." } });
    } catch (error) {
      next(error);
    }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPasswordWithOtp(req.body);
      res.json({ data: { success: true, message: "Password reset successful. You can now log in with your new password." } });
    } catch (error) {
      next(error);
    }
  },
};
