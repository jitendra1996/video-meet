export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = "AppError";
        Error.captureStackTrace?.(this, this.constructor);
    }
}
//# sourceMappingURL=AppError.js.map