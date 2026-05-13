import { AttendanceSession } from "./attendance.model.js";
export class AttendanceRepository {
    async createOpenSession(liveClassId, userId) {
        return AttendanceSession.create({
            liveClassId,
            userId,
            joinedAt: new Date(),
            durationSeconds: 0,
        });
    }
    async findOpenSession(liveClassId, userId) {
        return AttendanceSession.findOne({
            liveClassId,
            userId,
            leftAt: { $exists: false },
        })
            .sort({ joinedAt: -1 })
            .exec();
    }
    async closeSession(sessionId, leftAt, durationSeconds) {
        return AttendanceSession.findByIdAndUpdate(sessionId, { leftAt, durationSeconds }, { new: true }).exec();
    }
    async listByClass(liveClassId) {
        return AttendanceSession.find({ liveClassId }).sort({ joinedAt: 1 }).exec();
    }
    /** Updates duration for an open session (presence ping) without closing it. */
    async updateOpenDuration(sessionId, durationSeconds) {
        await AttendanceSession.updateOne({ _id: sessionId, leftAt: { $exists: false } }, { $set: { durationSeconds } }).exec();
    }
}
//# sourceMappingURL=attendance.repository.js.map