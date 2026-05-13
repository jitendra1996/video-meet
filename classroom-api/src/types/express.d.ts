import type { AccessTokenPayload } from "../common/utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` middleware on protected routes. */
      user?: AccessTokenPayload;
    }
  }
}

export {};
