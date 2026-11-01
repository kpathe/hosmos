import { Router } from "express";
import { z } from "zod";
import { authController } from "./auth.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { authLoginLimiter, authRegisterLimiter, authRefreshLimiter, authOtpLimiter } from "../../middlewares/rate-limit.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const authRouter = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const loginOwnerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password_plain: z.string().min(1, "Password is required"),
});

const loginManagerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password_plain: z.string().min(1, "Password is required"),
});

const loginHostellerSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  password_plain: z.string().min(1, "Password is required"),
});

const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const registerHostellerSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
  password_plain: z.string().min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z.object({
  old_password_plain: z.string().min(1, "Old password is required"),
  new_password_plain: z.string().min(8, "New password must be at least 8 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "Reset code must be exactly 6 digits").regex(/^\d+$/, "Code must contain numbers only"),
  new_password_plain: z.string().min(8, "New password must be at least 8 characters"),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

authRouter.post("/login/owner", authLoginLimiter, validateBody(loginOwnerSchema), authController.loginOwner);
authRouter.post("/login/manager", authLoginLimiter, validateBody(loginManagerSchema), authController.loginManager);
authRouter.post("/login/hosteller", authLoginLimiter, validateBody(loginHostellerSchema), authController.loginHosteller);
authRouter.post("/register/hosteller/send-otp", authOtpLimiter, validateBody(sendOtpSchema), authController.sendHostellerOtp);
authRouter.post("/register/hosteller", authRegisterLimiter, validateBody(registerHostellerSchema), authController.registerHosteller);

authRouter.post("/forgot-password", authOtpLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", authRegisterLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

authRouter.post("/refresh", authRefreshLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);

// Must be authenticated to change password
authRouter.post("/change-password", requireAuth, validateBody(changePasswordSchema), authController.changePassword);
