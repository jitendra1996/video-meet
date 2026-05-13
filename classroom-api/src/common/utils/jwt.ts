import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRole } from "../../modules/users/user.model.js";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const options = {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "classroom-api",
    audience: "classroom-clients",
  } as SignOptions;
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: "classroom-api",
    audience: "classroom-clients",
  });
  if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
    throw new Error("Invalid token payload");
  }
  const { sub, email, role } = decoded as Record<string, unknown>;
  if (typeof sub !== "string" || typeof email !== "string" || typeof role !== "string") {
    throw new Error("Invalid token claims");
  }
  return { sub, email, role: role as UserRole };
}
