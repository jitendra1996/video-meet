import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IChatMessage extends Document {
  liveClassId: Types.ObjectId;
  userId: Types.ObjectId;
  /** Stored XSS-sanitized plain text */
  body: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ liveClassId: 1, createdAt: -1 });

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ?? mongoose.model<IChatMessage>("ChatMessage", chatMessageSchema);
