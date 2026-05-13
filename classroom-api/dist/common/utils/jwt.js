import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
export function signAccessToken(payload) {
    const options = {
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: "classroom-api",
        audience: "classroom-clients",
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: "classroom-api",
        audience: "classroom-clients",
    });
    if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
        throw new Error("Invalid token payload");
    }
    const { sub, email, role } = decoded;
    if (typeof sub !== "string" || typeof email !== "string" || typeof role !== "string") {
        throw new Error("Invalid token claims");
    }
    return { sub, email, role: role };
}
//# sourceMappingURL=jwt.js.map