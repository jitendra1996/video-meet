import { Recording } from "./recording.model.js";
export class RecordingRepository {
    async findById(id) {
        return Recording.findById(id).exec();
    }
    async create(data) {
        return Recording.create(data);
    }
    async listByClass(liveClassId) {
        return Recording.find({ liveClassId }).sort({ createdAt: -1 }).exec();
    }
    async updateById(id, patch) {
        return Recording.findByIdAndUpdate(id, patch, { new: true }).exec();
    }
    async findByHmsId(hmsRecordingId) {
        return Recording.findOne({ hmsRecordingId }).exec();
    }
    async setStatusForClass(liveClassId, status, patch) {
        await Recording.updateMany({ liveClassId, status: "processing" }, { status, ...patch }).exec();
    }
}
//# sourceMappingURL=recording.repository.js.map