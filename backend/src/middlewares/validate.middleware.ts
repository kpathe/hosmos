import type { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ValidationError } from "../utils/errors.js";

/**
 * Middleware to validate request body against a Zod schema.
 * Throws a standardized ValidationError on failure.
 */
export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".");
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        next(new ValidationError("Validation failed", details));
      } else {
        next(error);
      }
    }
  };
}
