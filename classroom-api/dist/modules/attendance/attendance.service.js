import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { AttendanceSession } from "./attendance.model.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
export class AttendanceService {
    liveClasses;
    constructor(liveClasses = new LiveClassRepository()) {
        this.liveClasses = liveClasses;
    }
    /** Expected session length in seconds (for percentage), from actual or scheduled window. */
    plannedSeconds(classDoc) {
        if (classDoc.startedAt && classDoc.endedAt) {
            return Math.max(60, Math.floor((classDoc.endedAt.getTime() - classDoc.startedAt.getTime()) / 1000));
        }
        if (classDoc.scheduledStart && classDoc.scheduledEnd) {
            return Math.max(60, Math.floor((classDoc.scheduledEnd.getTime() - classDoc.scheduledStart.getTime()) / 1000));
        }
        return 3600;
    }
    async summary(user, liveClassId) {
        const doc = await this.liveClasses.findById(liveClassId);
        if (!doc)
            throw new AppError(404, "Class not found", "NOT_FOUND");
        const uid = new mongoose.Types.ObjectId(user.sub);
        const canSee = user.role === "admin" ||
            doc.teacherId.equals(uid) ||
            doc.enrolledStudentIds.some((id) => id.equals(uid));
        if (!canSee)
            throw new AppError(403, "Forbidden", "FORBIDDEN");
        const planned = this.plannedSeconds(doc);
        const agg = await AttendanceSession.aggregate([
            { $match: { liveClassId: new mongoose.Types.ObjectId(liveClassId) } },
            {
                $group: {
                    _id: "$userId",
                    totalSeconds: { $sum: "$durationSeconds" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user" } },
            { $sort: { totalSeconds: -1 } },
        ]);
        const rows = agg.map((a) => {
            const pct = Math.min(100, Math.round((a.totalSeconds / planned) * 100));
            return {
                userId: a._id.toString(),
                name: a.user.name,
                email: a.user.email,
                totalSeconds: a.totalSeconds,
                attendancePercent: pct,
            };
        });
        return { plannedSeconds: planned, rows };
    }
    toCsv(rows) {
        const header = "userId,name,email,totalSeconds,attendancePercent\n";
        const body = rows
            .map((r) => `${r.userId},${escapeCsv(r.name)},${escapeCsv(r.email)},${r.totalSeconds},${r.attendancePercent}`)
            .join("\n");
        return header + body;
    }
}
function escapeCsv(s) {
    if (/[",\n]/.test(s))
        return `"${s.replace(/"/g, '""')}"`;
    return s;
}
//# sourceMappingURL=attendance.service.js.map