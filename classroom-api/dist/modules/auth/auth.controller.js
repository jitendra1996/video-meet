import { AppError } from "../../common/errors/AppError.js";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { created, ok } from "../../common/utils/response.js";
import { AuthService } from "./auth.service.js";
import { UserRepository } from "../users/user.repository.js";
export class AuthController {
    service;
    users;
    constructor(service = new AuthService(), users = new UserRepository()) {
        this.service = service;
        this.users = users;
    }
    register = asyncHandler(async (req, res) => {
        const body = req.body;
        const result = await this.service.register(body);
        return created(res, result);
    });
    login = asyncHandler(async (req, res) => {
        const body = req.body;
        const result = await this.service.login(body);
        return ok(res, result);
    });
    me = asyncHandler(async (req, res) => {
        if (!req.user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const profile = await this.users.findById(req.user.sub);
        if (!profile)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
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
//# sourceMappingURL=auth.controller.js.map