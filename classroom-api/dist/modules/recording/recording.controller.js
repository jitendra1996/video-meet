import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { ok } from "../../common/utils/response.js";
import { RecordingService } from "./recording.service.js";
import { AppError } from "../../common/errors/AppError.js";
export class RecordingController {
    service;
    constructor(service = new RecordingService()) {
        this.service = service;
    }
    list = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { liveClassId } = req.query;
        const rows = await this.service.list(user, liveClassId);
        return ok(res, rows);
    });
    playUrl = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const data = await this.service.playbackUrl(user, id);
        return ok(res, data);
    });
}
//# sourceMappingURL=recording.controller.js.map