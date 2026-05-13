import type { Request, Response } from "express";
import { AppError } from "../../common/errors/AppError.js";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { created, ok } from "../../common/utils/response.js";
import { AuthService } from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.dto.js";
import { UserRepository } from "../users/user.repository.js";

export class AuthController {
  constructor(
    private readonly service: AuthService = new AuthService(),
    private readonly users: UserRepository = new UserRepository()
  ) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as RegisterInput;
    const result = await this.service.register(body);
    return created(res, result);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as LoginInput;
    const result = await this.service.login(body);
    return ok(res, result);
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const profile = await this.users.findById(req.user.sub);
    if (!profile) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    return ok(res, {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
      },
    });
  });
}
