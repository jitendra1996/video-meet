import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../errors/AppError.js";
import type { UserRole } from "../../modules/users/user.model.js";

function extractBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearer(req);
    if (!token) {
      throw new AppError(401, "Missing bearer token", "UNAUTHORIZED");
    }
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token", "UNAUTHORIZED"));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
      return;
    }
    if (!roles.includes(user.role as UserRole)) {
      next(new AppError(403, "Forbidden", "FORBIDDEN"));
      return;
    }
    next();
  };
}
