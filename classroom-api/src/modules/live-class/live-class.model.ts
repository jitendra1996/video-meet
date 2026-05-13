import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type LiveClassStatus = "draft" | "scheduled" | "live" | "ended";

export interface ILiveClass extends Document {
  title: string;
  description?: string;
  teacherId: Types.ObjectId;
  enrolledStudentIds: Types.ObjectId[];
  scheduledStart?: Date;
  scheduledEnd?: Date;
  /** 100ms room id returned from dashboard API */
  hmsRoomId: string;
  status: LiveClassStatus;
  recordingEnabled: boolean;
  /** Active session id from 100ms when class is live (for recording hooks) */
  hmsSessionId?: string;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const liveClassSchema = new Schema<ILiveClass>(
  {
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
  },
  { timestamps: true }
);

liveClassSchema.index({ teacherId: 1, status: 1 });
liveClassSchema.index({ enrolledStudentIds: 1, status: 1 });

export const LiveClass: Model<ILiveClass> =
  mongoose.models.LiveClass ?? mongoose.model<ILiveClass>("LiveClass", liveClassSchema);
