import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../errors/AppError.js";
function extractBearer(req) {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer "))
        return null;
    return h.slice("Bearer ".length).trim();
}
export function authenticate(req, _res, next) {
    try {
        const token = extractBearer(req);
        if (!token) {
            throw new AppError(401, "Missing bearer token", "UNAUTHORIZED");
        }
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    }
    catch {
        next(new AppError(401, "Invalid or expired token", "UNAUTHORIZED"));
    }
}
export function requireRoles(...roles) {
    return (req, _res, next) => {
        const user = req.user;
        if (!user) {
            next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
            return;
        }
        if (!roles.includes(user.role)) {
            next(new AppError(403, "Forbidden", "FORBIDDEN"));
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map