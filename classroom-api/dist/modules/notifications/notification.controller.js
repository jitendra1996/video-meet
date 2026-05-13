import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { ok } from "../../common/utils/response.js";
import { NotificationRepository } from "./notification.repository.js";
import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
export class NotificationController {
    repo;
    constructor(repo = new NotificationRepository()) {
        this.repo = repo;
    }
    list = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const rows = await this.repo.listForUser(new mongoose.Types.ObjectId(user.sub));
        return ok(res, rows);
    });
    markRead = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const updated = await this.repo.markRead(id, new mongoose.Types.ObjectId(user.sub));
        if (!updated)
            throw new AppError(404, "Notification not found", "NOT_FOUND");
        return ok(res, updated);
    });
}
//# sourceMappingURL=notification.controller.js.map