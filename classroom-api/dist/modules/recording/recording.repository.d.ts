import type { Types } from "mongoose";
import { type IRecording, type RecordingStatus } from "./recording.model.js";
export declare class RecordingRepository {
    findById(id: string): Promise<IRecording | null>;
    create(data: Partial<IRecording>): Promise<IRecording>;
    listByClass(liveClassId: Types.ObjectId): Promise<IRecording[]>;
    updateById(id: string, patch: Partial<IRecording>): Promise<IRecording | null>;
    findByHmsId(hmsRecordingId: string): Promise<IRecording | null>;
    setStatusForClass(liveClassId: Types.ObjectId, status: RecordingStatus, patch: Partial<IRecording>): Promise<void>;
}
//# sourceMappingURL=recording.repository.d.ts.map