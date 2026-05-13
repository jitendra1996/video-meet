import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type RecordingStatus = "processing" | "ready" | "failed";

export interface IRecording extends Document {
  liveClassId: Types.ObjectId;
  /** 100ms session / recording identifier when available */
  hmsRecordingId?: string;
  status: RecordingStatus;
  /** Object key in S3 (private bucket) */
  s3Key?: string;
  /** Original playback URL from provider webhook (if any) */
  providerPlaybackUrl?: string;
  mimeType?: string;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const recordingSchema = new Schema<IRecording>(
  {
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
  },
  { timestamps: true }
);

recordingSchema.index({ liveClassId: 1, createdAt: -1 });

export const Recording: Model<IRecording> =
  mongoose.models.Recording ?? mongoose.model<IRecording>("Recording", recordingSchema);
