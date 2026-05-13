import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { created, ok } from "../../common/utils/response.js";
import { LiveClassService } from "./live-class.service.js";
import { AppError } from "../../common/errors/AppError.js";
export class LiveClassController {
    service;
    constructor(service = new LiveClassService()) {
        this.service = service;
    }
    create = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const body = req.body;
        const doc = await this.service.create(user, body);
        return created(res, doc);
    });
    schedule = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const body = req.body;
        const doc = await this.service.schedule(user, id, body);
        return ok(res, doc);
    });
    start = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const doc = await this.service.start(user, id);
        return ok(res, doc);
    });
    end = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const doc = await this.service.end(user, id);
        return ok(res, doc);
    });
    enroll = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const { studentId } = req.body;
        const doc = await this.service.enroll(user, id, studentId);
        return ok(res, doc);
    });
    join = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const creds = await this.service.join(user, id);
        return ok(res, creds);
    });
    leave = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        await this.service.leave(user, id);
        return ok(res, { ok: true });
    });
    list = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const rows = await this.service.list(user);
        return ok(res, rows);
    });
    get = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const doc = await this.service.getById(user, id);
        return ok(res, doc);
    });
    removeParticipant = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const { peerId } = req.body;
        await this.service.removeParticipant(user, id, peerId);
        return ok(res, { ok: true });
    });
}
//# sourceMappingURL=live-class.controller.js.map