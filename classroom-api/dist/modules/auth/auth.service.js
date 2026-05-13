import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/AppError.js";
import { signAccessToken } from "../../common/utils/jwt.js";
import { UserRepository } from "../users/user.repository.js";
const SALT_ROUNDS = 12;
export class AuthService {
    users;
    constructor(users = new UserRepository()) {
        this.users = users;
    }
    resolveRole(input) {
        const requested = input.role ?? "student";
        if (requested === "student")
            return "student";
        if (requested === "teacher") {
            if (!env.TEACHER_INVITE_CODE || input.inviteCode !== env.TEACHER_INVITE_CODE) {
                throw new AppError(403, "Invalid teacher invite code", "INVITE_INVALID");
            }
            return "teacher";
        }
        if (requested === "admin") {
            if (!env.ADMIN_INVITE_CODE || input.inviteCode !== env.ADMIN_INVITE_CODE) {
                throw new AppError(403, "Invalid admin invite code", "INVITE_INVALID");
            }
            return "admin";
        }
        return "student";
    }
    async register(input) {
        const existing = await this.users.findByEmail(input.email);
        if (existing) {
            throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
        }
        const role = this.resolveRole(input);
        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
        const user = await this.users.create({
            email: input.email.toLowerCase(),
            passwordHash,
            name: input.name,
            role,
        });
        const token = signAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
        return {
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        };
    }
    async login(input) {
        const user = await this.users.findByEmail(input.email, true);
        if (!user?.passwordHash) {
            throw new AppError(401, "Invalid credentials", "AUTH_FAILED");
        }
        const ok = await bcrypt.compare(input.password, user.passwordHash);
        if (!ok) {
            throw new AppError(401, "Invalid credentials", "AUTH_FAILED");
        }
        const token = signAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
        return {
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        };
    }
}
//# sourceMappingURL=auth.service.js.map