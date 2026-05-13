import { Notification } from "./notification.model.js";
export class NotificationRepository {
    async create(data) {
        return Notification.create(data);
    }
    async listForUser(userId, limit = 50) {
        return Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
    }
    async markRead(id, userId) {
        return Notification.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true }).exec();
    }
}
//# sourceMappingURL=notification.repository.js.map