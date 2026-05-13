import type { RequestHandler } from "express";

/** Wraps async route handlers so rejections reach Express error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
