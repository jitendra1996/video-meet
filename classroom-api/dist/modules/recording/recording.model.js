import mongoose, { Schema } from "mongoose";
const recordingSchema = new Schema({
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
    hmsRecordingId: { type: String, index: true },
    status: {
        type: String,
        enum: ["processing", "ready", "failed"],
        default: "processing",
        index: true,
    },
    s3Key: { type: String },
    providerPlaybackUrl: { type: String },
    mimeType: { type: String },
    durationSeconds: { type: Number },
}, { timestamps: true });
recordingSchema.index({ liveClassId: 1, createdAt: -1 });
export const Recording = mongoose.models.Recording ?? mongoose.model("Recording", recordingSchema);
//# sourceMappingURL=recording.model.js.map