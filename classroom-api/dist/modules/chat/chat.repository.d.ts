import type { Types } from "mongoose";
import { type IChatMessage } from "./chat-message.model.js";
export declare class ChatRepository {
    create(data: {
        liveClassId: Types.ObjectId;
        userId: Types.ObjectId;
        body: string;
    }): Promise<IChatMessage>;
    listHistory(liveClassId: Types.ObjectId, limit?: number): Promise<IChatMessage[]>;
}
//# sourceMappingURL=chat.repository.d.ts.map