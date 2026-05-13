import type { Types } from "mongoose";
import { type IAttendanceSession } from "./attendance.model.js";
export declare class AttendanceRepository {
    createOpenSession(liveClassId: Types.ObjectId, userId: Types.ObjectId): Promise<IAttendanceSession>;
    findOpenSession(liveClassId: Types.ObjectId, userId: Types.ObjectId): Promise<IAttendanceSession | null>;
    closeSession(sessionId: string, leftAt: Date, durationSeconds: number): Promise<IAttendanceSession | null>;
    listByClass(liveClassId: Types.ObjectId): Promise<IAttendanceSession[]>;
    /** Updates duration for an open session (presence ping) without closing it. */
    updateOpenDuration(sessionId: string, durationSeconds: number): Promise<void>;
}
//# sourceMappingURL=attendance.repository.d.ts.map