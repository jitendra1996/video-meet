import { ChatMessage } from "./chat-message.model.js";
export class ChatRepository {
    async create(data) {
        return ChatMessage.create(data);
    }
    async listHistory(liveClassId, limit = 200) {
        return ChatMessage.find({ liveClassId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("userId", "name email")
            .exec()
            .then((rows) => rows.reverse());
    }
}
//# sourceMappingURL=chat.repository.js.map