import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { created, ok } from "../../common/utils/response.js";
import { ChatService } from "./chat.service.js";
import { AppError } from "../../common/errors/AppError.js";
export class ChatController {
    service;
    constructor(service = new ChatService()) {
        this.service = service;
    }
    history = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const rows = await this.service.listHistory(user, id);
        return ok(res, rows);
    });
    post = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const { body } = req.body;
        const msg = await this.service.persistMessage(user, id, body);
        return created(res, msg);
    });
}
//# sourceMappingURL=chat.controller.js.map