import { ChatRepository } from "./chat.repository.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
import type { IChatMessage } from "./chat-message.model.js";
export declare class ChatService {
    private readonly chat;
    private readonly liveClasses;
    constructor(chat?: ChatRepository, liveClasses?: LiveClassRepository);
    listHistory(user: AccessTokenPayload, liveClassId: string): Promise<IChatMessage[]>;
    persistMessage(user: AccessTokenPayload, liveClassId: string, body: string): Promise<IChatMessage>;
    private assertAccess;
}
//# sourceMappingURL=chat.service.d.ts.map