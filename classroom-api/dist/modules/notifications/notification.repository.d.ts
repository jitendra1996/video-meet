import type { Types } from "mongoose";
import { type INotification, type NotificationType } from "./notification.model.js";
export declare class NotificationRepository {
    create(data: {
        userId: Types.ObjectId;
        type: NotificationType;
        title: string;
        message: string;
        metadata?: Record<string, unknown>;
    }): Promise<INotification>;
    listForUser(userId: Types.ObjectId, limit?: number): Promise<INotification[]>;
    markRead(id: string, userId: Types.ObjectId): Promise<INotification | null>;
}
//# sourceMappingURL=notification.repository.d.ts.map