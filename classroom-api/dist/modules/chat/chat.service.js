import sanitizeHtml from "sanitize-html";
import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { ChatRepository } from "./chat.repository.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
export class ChatService {
    chat;
    liveClasses;
    constructor(chat = new ChatRepository(), liveClasses = new LiveClassRepository()) {
        this.chat = chat;
        this.liveClasses = liveClasses;
    }
    async listHistory(user, liveClassId) {
        await this.assertAccess(user, liveClassId);
        return this.chat.listHistory(new mongoose.Types.ObjectId(liveClassId));
    }
    async persistMessage(user, liveClassId, body) {
        await this.assertAccess(user, liveClassId);
        const clean = sanitizeHtml(body, {
            allowedTags: [],
            allowedAttributes: {},
        }).trim();
        if (!clean) {
            throw new AppError(400, "Empty message", "EMPTY_MESSAGE");
        }
        return this.chat.create({
            liveClassId: new mongoose.Types.ObjectId(liveClassId),
            userId: new mongoose.Types.ObjectId(user.sub),
            body: clean.slice(0, 4000),
        });
    }
    async assertAccess(user, liveClassId) {
        const doc = await this.liveClasses.findById(liveClassId);
        if (!doc)
            throw new AppError(404, "Class not found", "NOT_FOUND");
        const uid = new mongoose.Types.ObjectId(user.sub);
        const okAccess = user.role === "admin" ||
            doc.teacherId.equals(uid) ||
            doc.enrolledStudentIds.some((id) => id.equals(uid));
        if (!okAccess)
            throw new AppError(403, "Forbidden", "FORBIDDEN");
    }
}
//# sourceMappingURL=chat.service.js.map