import { type Document, type Model, type Types } from "mongoose";
export type NotificationType = "class_scheduled" | "class_started" | "class_ended" | "recording_ready" | "enrollment";
export interface INotification extends Document {
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    readAt?: Date;
    createdAt: Date;
}
export declare const Notification: Model<INotification>;
//# sourceMappingURL=notification.model.d.ts.map