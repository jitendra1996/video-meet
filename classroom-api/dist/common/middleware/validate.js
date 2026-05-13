import { AppError } from "../errors/AppError.js";
/**
 * Validates the given part of the request with a Zod object schema.
 * On success, replaces that part with parsed output (coercions applied).
 */
export function validate(part, schema) {
    return (req, _res, next) => {
        const parsed = schema.safeParse(req[part]);
        if (!parsed.success) {
            next(new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.flatten()));
            return;
        }
        req[part] = parsed.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map