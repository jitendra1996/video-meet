import { type Document, type Model, type Types } from "mongoose";
/**
 * One document per contiguous presence interval (join → leave).
 * Multiple intervals per user per class yield multiple documents.
 */
export interface IAttendanceSession extends Document {
    liveClassId: Types.ObjectId;
    userId: Types.ObjectId;
    joinedAt: Date;
    leftAt?: Date;
    /** Total seconds present (computed on leave or end-of-class reconciliation) */
    durationSeconds: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AttendanceSession: Model<IAttendanceSession>;
//# sourceMappingURL=attendance.model.d.ts.map