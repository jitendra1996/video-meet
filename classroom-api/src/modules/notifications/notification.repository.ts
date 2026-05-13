import type { Types } from "mongoose";
import { Notification, type INotification, type NotificationType } from "./notification.model.js";

export class NotificationRepository {
  async create(data: {
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<INotification> {
    return Notification.create(data);
  }

  async listForUser(userId: Types.ObjectId, limit = 50): Promise<INotification[]> {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async markRead(id: string, userId: Types.ObjectId): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: id, userId },
      { readAt: new Date() },
      { new: true }
    ).exec();
  }
}
