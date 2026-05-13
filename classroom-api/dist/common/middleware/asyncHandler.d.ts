import type { RequestHandler } from "express";
/** Wraps async route handlers so rejections reach Express error middleware. */
export declare function asyncHandler(fn: RequestHandler): RequestHandler;
//# sourceMappingURL=asyncHandler.d.ts.map