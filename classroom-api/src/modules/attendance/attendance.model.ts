import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

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

const attendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    joinedAt: { type: Date, required: true, index: true },
    leftAt: { type: Date },
    durationSeconds: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ liveClassId: 1, userId: 1, joinedAt: -1 });

export const AttendanceSession: Model<IAttendanceSession> =
  mongoose.models.AttendanceSession ??
  mongoose.model<IAttendanceSession>("AttendanceSession", attendanceSessionSchema);
