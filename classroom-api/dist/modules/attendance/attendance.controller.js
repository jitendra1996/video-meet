import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { ok } from "../../common/utils/response.js";
import { AttendanceService } from "./attendance.service.js";
import { AppError } from "../../common/errors/AppError.js";
export class AttendanceController {
    service;
    constructor(service = new AttendanceService()) {
        this.service = service;
    }
    summary = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const data = await this.service.summary(user, id);
        return ok(res, data);
    });
    exportCsv = asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user)
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        const { id } = req.params;
        const { rows } = await this.service.summary(user, id);
        const csv = this.service.toCsv(rows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="attendance-${id}.csv"`);
        res.send(csv);
    });
}
//# sourceMappingURL=attendance.controller.js.map