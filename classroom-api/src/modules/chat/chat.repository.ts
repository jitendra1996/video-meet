import type { Types } from "mongoose";
import { ChatMessage, type IChatMessage } from "./chat-message.model.js";

export class ChatRepository {
  async create(data: {
    liveClassId: Types.ObjectId;
    userId: Types.ObjectId;
    body: string;
  }): Promise<IChatMessage> {
    return ChatMessage.create(data);
  }

  async listHistory(liveClassId: Types.ObjectId, limit = 200): Promise<IChatMessage[]> {
    return ChatMessage.find({ liveClassId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email")
      .exec()
      .then((rows) => rows.reverse());
  }
}
