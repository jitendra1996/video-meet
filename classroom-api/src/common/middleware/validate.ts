import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../errors/AppError.js";

type RequestPart = "body" | "query" | "params";

/**
 * Validates the given part of the request with a Zod object schema.
 * On success, replaces that part with parsed output (coercions applied).
 */
export function validate(part: RequestPart, schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[part]);
    if (!parsed.success) {
      next(
        new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.flatten())
      );
      return;
    }
    (req as Request & Record<string, unknown>)[part] = parsed.data;
    next();
  };
}
