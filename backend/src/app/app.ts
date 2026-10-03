import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsAllowedOrigins, isDevelopment } from "../config/env.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";
import { generalApiLimiter } from "../middlewares/rate-limit.middleware.js";
import { authRouter } from "../modules/auth/auth.routes.js";

// ─────────────────────────────────────────────────────────────────────────────
// Express Application Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createApp(): express.Application {
  const app = express();

  // ── Security headers (Helmet) ───────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: corsAllowedOrigins,
      credentials: true, // Required for HttpOnly cookie exchange
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ── Body & Cookie Parsing ───────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // ── General API Rate Limiting ───────────────────────────────────────────────
  // Applied globally. Auth-specific limits are applied at the route level.
  app.use("/api/v1", generalApiLimiter);

  // ── Health Check ────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env["NODE_ENV"] ?? "unknown",
    });
  });

  // ── API Routes (registered in Phase 1+) ────────────────────────────────────
  app.use("/api/v1/auth", authRouter);
  //
  // import { adminRouter } from "../modules/admin/admin.routes.js";
  // app.use("/api/v1/admin", adminRouter);
  //
  // import { portalRouter } from "../modules/portal/portal.routes.js";
  // app.use("/api/v1/portal", portalRouter);

  if (isDevelopment) {
    app.get("/api/v1", (_req, res) => {
      res.json({ message: "Hosmos API — Phase 0 scaffold ready. Routes coming in Phase 1." });
    });
  }

  // ── 404 Handler ─────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested endpoint does not exist",
      },
    });
  });

  // ── Global Error Handler (MUST be last) ─────────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
