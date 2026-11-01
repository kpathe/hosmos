import { eq, and, or, isNull, gt, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { owners, Owner } from "../../db/schema/owners.js";
import { managers, Manager } from "../../db/schema/managers.js";
import { hostellers, Hosteller } from "../../db/schema/hostellers.js";
import { refreshTokens, RefreshToken } from "../../db/schema/refresh-tokens.js";
import { otps } from "../../db/schema/otps.js";
import {
  verifyPassword,
  hashPassword,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  generateNumericOtp,
  hashOtp,
} from "../../utils/crypto.js";
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { env } from "../../config/env.js";
import type {
  LoginOwnerRequest,
  LoginManagerRequest,
  LoginHostellerRequest,
  RegisterHostellerRequest,
  SendHostellerOtpResponse,
  ChangePasswordRequest,
  LoginResponse,
  UserRole,
} from "@hosmos/types";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────────────────────

interface TokenIssueResult {
  accessToken: string;
  refreshToken: string; // Raw token to be sent in cookie
  expiresIn: number;
}

/**
 * Issues an access token and generates a new refresh token (saving hash to DB).
 */
async function issueTokens(
  userId: string,
  userType: UserRole,
  hostelId?: string,
  dbClient: any = db
): Promise<TokenIssueResult> {
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRY_SECONDS * 1000);

  // Store refresh token
  await dbClient.insert(refreshTokens).values({
    userId,
    userType,
    tokenHash,
    expiresAt,
  });

  const accessToken = signAccessToken({
    sub: userId,
    role: userType,
    ...(hostelId ? { hostel_id: hostelId } : {}),
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRY_SECONDS,
  };
}

export const authService = {
  // ─── Login ───────────────────────────────────────────────────────────────────

  async loginOwner(input: LoginOwnerRequest): Promise<LoginResponse & { rawRefreshToken: string }> {
    const [owner] = await db.select().from(owners).where(eq(owners.email, input.email));
    if (!owner) throw new AuthenticationError("Invalid email or password");

    const valid = await verifyPassword(input.password_plain, owner.passwordHash);
    if (!valid) throw new AuthenticationError("Invalid email or password");

    const tokens = await issueTokens(owner.id, "owner");

    return {
      access_token: tokens.accessToken,
      expires_in: tokens.expiresIn,
      rawRefreshToken: tokens.refreshToken,
      user: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: "owner",
      },
    };
  },

  async loginManager(input: LoginManagerRequest): Promise<LoginResponse & { rawRefreshToken: string }> {
    const [manager] = await db.select().from(managers).where(eq(managers.email, input.username)); // Using email as username for manager
    if (!manager) throw new AuthenticationError("Invalid username or password");

    const valid = await verifyPassword(input.password_plain, manager.passwordHash);
    if (!valid) throw new AuthenticationError("Invalid username or password");

    const tokens = await issueTokens(manager.id, "manager");

    return {
      access_token: tokens.accessToken,
      expires_in: tokens.expiresIn,
      rawRefreshToken: tokens.refreshToken,
      user: {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        role: "manager",
      },
    };
  },

  async loginHosteller(input: LoginHostellerRequest): Promise<LoginResponse & { rawRefreshToken: string }> {
    const [hosteller] = await db
      .select()
      .from(hostellers)
      .where(
        or(
          eq(hostellers.email, input.identifier),
          eq(hostellers.nameSlug, input.identifier)
        )
      );

    if (!hosteller || !hosteller.passwordHash) {
      throw new AuthenticationError("Invalid credentials");
    }

    if (hosteller.status === "removed") {
      throw new AuthenticationError("Account is inactive");
    }

    const valid = await verifyPassword(input.password_plain, hosteller.passwordHash);
    if (!valid) throw new AuthenticationError("Invalid credentials");

    const tokens = await issueTokens(hosteller.id, "hosteller", hosteller.hostelId);

    return {
      access_token: tokens.accessToken,
      expires_in: tokens.expiresIn,
      rawRefreshToken: tokens.refreshToken,
      user: {
        id: hosteller.id,
        name: hosteller.name,
        email: hosteller.email,
        role: "hosteller",
        hostel_id: hosteller.hostelId,
      },
    };
  },

  // ─── Registration ──────────────────────────────────────────────────────────

  async sendHostellerRegistrationOtp(email: string): Promise<SendHostellerOtpResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verify that hosteller exists
    const [hosteller] = await db
      .select()
      .from(hostellers)
      .where(eq(hostellers.email, normalizedEmail));

    if (!hosteller) {
      throw new AuthenticationError("No admitted hosteller found with this email");
    }

    if (hosteller.status === "active") {
      throw new ValidationError("Account is already active. Please log in directly.");
    }

    if (hosteller.status === "removed") {
      throw new AuthenticationError("Account is inactive or removed");
    }

    if (hosteller.status !== "admitted") {
      throw new ValidationError("Account is not eligible for portal registration");
    }

    // 2. Check cooldown on recent active OTP (60s cooldown)
    const [recentOtp] = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.email, normalizedEmail),
          eq(otps.purpose, "hosteller_signup"),
          isNull(otps.consumedAt),
          gt(otps.expiresAt, new Date())
        )
      )
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (recentOtp) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(recentOtp.createdAt).getTime()) / 1000);
      const COOLDOWN_SECONDS = 60;
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        return {
          message: "Verification code was already sent recently. Please check your inbox or wait before retrying.",
          cooldown_seconds: COOLDOWN_SECONDS - elapsedSeconds,
        };
      }
    }

    // 3. Generate 6-digit numeric OTP and hash
    const rawOtp = generateNumericOtp();
    const otpHash = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Invalidate any prior active OTPs for this email
    await db
      .update(otps)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(otps.email, normalizedEmail),
          eq(otps.purpose, "hosteller_signup"),
          isNull(otps.consumedAt)
        )
      );

    // 5. Insert new OTP
    await db.insert(otps).values({
      email: normalizedEmail,
      otpHash,
      purpose: "hosteller_signup",
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
    });

    // 6. Deliver OTP: log to console (and ready for email delivery)
    console.log(`\n========================================================`);
    console.log(`🔑 [HOSTELLER REGISTRATION OTP]`);
    console.log(`   To: ${normalizedEmail} (${hosteller.name})`);
    console.log(`   OTP Code: ${rawOtp}`);
    console.log(`   Valid For: 10 minutes`);
    console.log(`========================================================\n`);

    return {
      message: `A 6-digit verification code has been sent to ${normalizedEmail}`,
      cooldown_seconds: 60,
    };
  },

  async registerHosteller(input: RegisterHostellerRequest): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const otpCode = input.otp.trim();

    // 1. Verify hosteller
    const [hosteller] = await db
      .select()
      .from(hostellers)
      .where(eq(hostellers.email, normalizedEmail));

    if (!hosteller) {
      throw new AuthenticationError("No admitted hosteller found with this email");
    }

    if (hosteller.status !== "admitted") {
      throw new AuthenticationError("Account is already registered or inactive");
    }

    // 2. Find valid unconsumed OTP
    const [activeOtp] = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.email, normalizedEmail),
          eq(otps.purpose, "hosteller_signup"),
          isNull(otps.consumedAt),
          gt(otps.expiresAt, new Date())
        )
      )
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (!activeOtp) {
      throw new ValidationError("Verification code expired or not found. Please request a new code.");
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await db
        .update(otps)
        .set({ consumedAt: new Date() })
        .where(eq(otps.id, activeOtp.id));
      throw new ValidationError("Too many incorrect attempts. Please request a new verification code.");
    }

    // 3. Verify OTP Hash
    const inputHash = hashOtp(otpCode);
    if (inputHash !== activeOtp.otpHash) {
      const nextAttempts = activeOtp.attempts + 1;
      await db
        .update(otps)
        .set({ attempts: nextAttempts })
        .where(eq(otps.id, activeOtp.id));

      const remaining = activeOtp.maxAttempts - nextAttempts;
      throw new ValidationError(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : "Invalid verification code. Maximum attempts exceeded. Please request a new code."
      );
    }

    // 4. Mark OTP consumed and activate hosteller in transaction
    await db.transaction(async (tx) => {
      await tx
        .update(otps)
        .set({ consumedAt: new Date() })
        .where(eq(otps.id, activeOtp.id));

      const passwordHash = await hashPassword(input.password_plain);

      await tx
        .update(hostellers)
        .set({
          passwordHash,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(hostellers.id, hosteller.id));
    });
  },

  // ─── Token Rotation ────────────────────────────────────────────────────────

  async refreshTokens(rawToken: string): Promise<LoginResponse & { rawRefreshToken: string }> {
    const hash = hashRefreshToken(rawToken);

    return await db.transaction(async (tx) => {
      // Find valid token
      const [tokenRecord] = await tx
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, hash),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date())
          )
        );

      if (!tokenRecord) {
        throw new AuthenticationError("Invalid or expired refresh token");
      }

      // Revoke old token
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, tokenRecord.id));

      // Issue new tokens
      const newTokens = await issueTokens(tokenRecord.userId, tokenRecord.userType, undefined, tx);

      // Get user data for response
      let user: LoginResponse["user"] | null = null;
      let hostelId: string | undefined;

      if (tokenRecord.userType === "owner") {
        const [owner] = await tx.select().from(owners).where(eq(owners.id, tokenRecord.userId));
        if (owner) {
          user = { id: owner.id, name: owner.name, email: owner.email, role: "owner" };
        }
      } else if (tokenRecord.userType === "manager") {
        const [manager] = await tx.select().from(managers).where(eq(managers.id, tokenRecord.userId));
        if (manager) {
          user = { id: manager.id, name: manager.name, email: manager.email, role: "manager" };
        }
      } else if (tokenRecord.userType === "hosteller") {
        const [hosteller] = await tx.select().from(hostellers).where(eq(hostellers.id, tokenRecord.userId));
        if (hosteller) {
          user = { id: hosteller.id, name: hosteller.name, email: hosteller.email, role: "hosteller", hostel_id: hosteller.hostelId };
          hostelId = hosteller.hostelId;
        }
      }

      if (!user) {
        throw new AuthenticationError("User not found");
      }
      
      // We need to re-issue access token with hostel_id for hostellers if we didn't initially in issueTokens (since issueTokens didn't have hostelId)
      // Actually, wait, issueTokens inside the transaction didn't have hostelId! 
      // Let's re-sign the access token with the correct hostel_id if hosteller.
      if (tokenRecord.userType === "hosteller" && hostelId) {
        newTokens.accessToken = signAccessToken({
          sub: tokenRecord.userId,
          role: "hosteller",
          hostel_id: hostelId,
        });
      }

      return {
        access_token: newTokens.accessToken,
        expires_in: newTokens.expiresIn,
        rawRefreshToken: newTokens.refreshToken,
        user,
      };
    });
  },

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(rawToken: string): Promise<void> {
    const hash = hashRefreshToken(rawToken);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)));
  },

  // ─── Change Password ───────────────────────────────────────────────────────

  async changePassword(userId: string, userType: UserRole, input: ChangePasswordRequest): Promise<void> {
    return await db.transaction(async (tx) => {
      let currentHash: string | undefined;

      if (userType === "owner") {
        const [owner] = await tx.select({ passwordHash: owners.passwordHash }).from(owners).where(eq(owners.id, userId));
        currentHash = owner?.passwordHash;
      } else if (userType === "manager") {
        const [manager] = await tx.select({ passwordHash: managers.passwordHash }).from(managers).where(eq(managers.id, userId));
        currentHash = manager?.passwordHash;
      } else if (userType === "hosteller") {
        const [hosteller] = await tx.select({ passwordHash: hostellers.passwordHash }).from(hostellers).where(eq(hostellers.id, userId));
        currentHash = hosteller?.passwordHash ?? undefined;
      }

      if (!currentHash) {
        throw new AuthenticationError("User not found");
      }

      const valid = await verifyPassword(input.old_password_plain, currentHash);
      if (!valid) throw new AuthenticationError("Incorrect old password");

      const newHash = await hashPassword(input.new_password_plain);

      if (userType === "owner") {
        await tx.update(owners).set({ passwordHash: newHash, mustChangePassword: false, updatedAt: new Date() }).where(eq(owners.id, userId));
      } else if (userType === "manager") {
        await tx.update(managers).set({ passwordHash: newHash, mustChangePassword: false, updatedAt: new Date() }).where(eq(managers.id, userId));
      } else if (userType === "hosteller") {
        await tx.update(hostellers).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(hostellers.id, userId));
      }

      // Revoke all existing refresh tokens for security
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.userType, userType), isNull(refreshTokens.revokedAt)));
    });
  },
};
