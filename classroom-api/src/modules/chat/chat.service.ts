import sanitizeHtml from "sanitize-html";
import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { ChatRepository } from "./chat.repository.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
import type { IChatMessage } from "./chat-message.model.js";

export class ChatService {
  constructor(
    private readonly chat = new ChatRepository(),
    private readonly liveClasses = new LiveClassRepository()
  ) {}

  async listHistory(user: AccessTokenPayload, liveClassId: string): Promise<IChatMessage[]> {
    await this.assertAccess(user, liveClassId);
    return this.chat.listHistory(new mongoose.Types.ObjectId(liveClassId));
  }

  async persistMessage(
    user: AccessTokenPayload,
    liveClassId: string,
    body: string
  ): Promise<IChatMessage> {
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

  private async assertAccess(user: AccessTokenPayload, liveClassId: string): Promise<void> {
    const doc = await this.liveClasses.findById(liveClassId);
    if (!doc) throw new AppError(404, "Class not found", "NOT_FOUND");
    const uid = new mongoose.Types.ObjectId(user.sub);
    const okAccess =
      user.role === "admin" ||
      doc.teacherId.equals(uid) ||
      doc.enrolledStudentIds.some((id) => id.equals(uid));
    if (!okAccess) throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
}
