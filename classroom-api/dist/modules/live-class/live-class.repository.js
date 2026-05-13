import { LiveClass } from "./live-class.model.js";
export class LiveClassRepository {
    async findById(id) {
        return LiveClass.findById(id).exec();
    }
    async create(data) {
        return LiveClass.create(data);
    }
    async updateById(id, patch) {
        return LiveClass.findByIdAndUpdate(id, patch, { new: true }).exec();
    }
    async listForUser(userId, role) {
        const filter = role === "teacher"
            ? { teacherId: userId }
            : role === "admin"
                ? {}
                : { enrolledStudentIds: userId };
        return LiveClass.find(filter).sort({ scheduledStart: -1, createdAt: -1 }).limit(200).exec();
    }
    async setStatus(id, status, extra) {
        return LiveClass.findByIdAndUpdate(id, { status, ...extra }, { new: true }).exec();
    }
}
//# sourceMappingURL=live-class.repository.js.map