import { type Document, type Model, type Types } from "mongoose";
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
export declare const LiveClass: Model<ILiveClass>;
//# sourceMappingURL=live-class.model.d.ts.map