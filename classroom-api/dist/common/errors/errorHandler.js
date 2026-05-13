import { ZodError } from "zod";
import { AppError } from "./AppError.js";
import { logger } from "../logger.js";
export function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
            details: err.details,
        });
        return;
    }
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: err.flatten(),
        });
        return;
    }
    logger.error({ err }, "Unhandled error");
    res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
    });
}
//# sourceMappingURL=errorHandler.js.map