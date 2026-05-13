import { type Document, type Model, type Types } from "mongoose";
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
export declare const Recording: Model<IRecording>;
//# sourceMappingURL=recording.model.d.ts.map