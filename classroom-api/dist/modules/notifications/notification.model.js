import mongoose, { Schema } from "mongoose";
const notificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
        type: String,
        enum: [
            "class_scheduled",
            "class_started",
            "class_ended",
            "recording_ready",
            "enrollment",
        ],
        required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 2000 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
export const Notification = mongoose.models.Notification ??
    mongoose.model("Notification", notificationSchema);
//# sourceMappingURL=notification.model.js.map