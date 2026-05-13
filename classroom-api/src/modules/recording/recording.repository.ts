import type { Types } from "mongoose";
import { Recording, type IRecording, type RecordingStatus } from "./recording.model.js";

export class RecordingRepository {
  async findById(id: string): Promise<IRecording | null> {
    return Recording.findById(id).exec();
  }

  async create(data: Partial<IRecording>): Promise<IRecording> {
    return Recording.create(data);
  }

  async listByClass(liveClassId: Types.ObjectId): Promise<IRecording[]> {
    return Recording.find({ liveClassId }).sort({ createdAt: -1 }).exec();
  }

  async updateById(id: string, patch: Partial<IRecording>): Promise<IRecording | null> {
    return Recording.findByIdAndUpdate(id, patch, { new: true }).exec();
  }

  async findByHmsId(hmsRecordingId: string): Promise<IRecording | null> {
    return Recording.findOne({ hmsRecordingId }).exec();
  }

  async setStatusForClass(
    liveClassId: Types.ObjectId,
    status: RecordingStatus,
    patch: Partial<IRecording>
  ): Promise<void> {
    await Recording.updateMany({ liveClassId, status: "processing" }, { status, ...patch }).exec();
  }
}
