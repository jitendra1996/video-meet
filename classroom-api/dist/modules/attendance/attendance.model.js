import mongoose, { Schema } from "mongoose";
const attendanceSessionSchema = new Schema({
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    joinedAt: { type: Date, required: true, index: true },
    leftAt: { type: Date },
    durationSeconds: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
attendanceSessionSchema.index({ liveClassId: 1, userId: 1, joinedAt: -1 });
export const AttendanceSession = mongoose.models.AttendanceSession ??
    mongoose.model("AttendanceSession", attendanceSessionSchema);
//# sourceMappingURL=attendance.model.js.map