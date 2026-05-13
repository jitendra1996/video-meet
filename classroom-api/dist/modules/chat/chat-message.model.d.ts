import { type Document, type Model, type Types } from "mongoose";
export interface IChatMessage extends Document {
    liveClassId: Types.ObjectId;
    userId: Types.ObjectId;
    /** Stored XSS-sanitized plain text */
    body: string;
    createdAt: Date;
}
export declare const ChatMessage: Model<IChatMessage>;
//# sourceMappingURL=chat-message.model.d.ts.map