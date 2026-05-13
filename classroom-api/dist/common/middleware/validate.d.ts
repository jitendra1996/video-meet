import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
type RequestPart = "body" | "query" | "params";
/**
 * Validates the given part of the request with a Zod object schema.
 * On success, replaces that part with parsed output (coercions applied).
 */
export declare function validate(part: RequestPart, schema: ZodSchema): (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validate.d.ts.map