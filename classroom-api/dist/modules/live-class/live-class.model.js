import mongoose, { Schema } from "mongoose";
const liveClassSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 4000 },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    enrolledStudentIds: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    scheduledStart: { type: Date, index: true },
    scheduledEnd: { type: Date },
    hmsRoomId: { type: String, required: true, index: true },
    status: {
        type: String,
        enum: ["draft", "scheduled", "live", "ended"],
        default: "draft",
        index: true,
    },
    recordingEnabled: { type: Boolean, default: true },
    hmsSessionId: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date },
}, { timestamps: true });
liveClassSchema.index({ teacherId: 1, status: 1 });
liveClassSchema.index({ enrolledStudentIds: 1, status: 1 });
export const LiveClass = mongoose.models.LiveClass ?? mongoose.model("LiveClass", liveClassSchema);
//# sourceMappingURL=live-class.model.js.map