import type { UserRole } from "../../modules/users/user.model.js";
export type AccessTokenPayload = {
    sub: string;
    email: string;
    role: UserRole;
};
export declare function signAccessToken(payload: AccessTokenPayload): string;
export declare function verifyAccessToken(token: string): AccessTokenPayload;
//# sourceMappingURL=jwt.d.ts.map