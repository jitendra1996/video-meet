import mongoose, { Schema } from "mongoose";
const chatMessageSchema = new Schema({
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, maxlength: 4000 },
}, { timestamps: { createdAt: true, updatedAt: false } });
chatMessageSchema.index({ liveClassId: 1, createdAt: -1 });
export const ChatMessage = mongoose.models.ChatMessage ?? mongoose.model("ChatMessage", chatMessageSchema);
//# sourceMappingURL=chat-message.model.js.map