import { env } from "./env.js";
import type { UserRole } from "@hosmos/types";

export const jwtConfig = {
  secret: env.JWT_SECRET,
  accessExpirySeconds: env.JWT_ACCESS_EXPIRY_SECONDS,
  refreshExpirySeconds: env.JWT_REFRESH_EXPIRY_SECONDS,
} as const;

export interface JwtPayload {
  sub: string;       // User UUID
  role: UserRole;
  hostel_id?: string; // Only for hostellers
  iat?: number;
  exp?: number;
}
