import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/AppError.js";
import { signAccessToken } from "../../common/utils/jwt.js";
import { UserRepository } from "../users/user.repository.js";
import type { LoginInput, RegisterInput } from "./auth.dto.js";
import type { UserRole } from "../users/user.model.js";

const SALT_ROUNDS = 12;

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  private resolveRole(input: RegisterInput): UserRole {
    const requested = input.role ?? "student";
    if (requested === "student") return "student";
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

  async register(input: RegisterInput): Promise<{ token: string; user: { id: string; email: string; name: string; role: UserRole } }> {
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

  async login(input: LoginInput): Promise<{ token: string; user: { id: string; email: string; name: string; role: UserRole } }> {
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
