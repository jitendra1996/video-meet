import { verifyAccessToken } from "../../common/utils/jwt.js";
import { logger } from "../../common/logger.js";
import { ChatService } from "../../modules/chat/chat.service.js";
import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { LiveClassRepository } from "../../modules/live-class/live-class.repository.js";
import { AttendanceRepository } from "../../modules/attendance/attendance.repository.js";
/**
 * Real-time classroom channel: chat, typing, lightweight presence, raise-hand, moderation hints.
 * Horizontal scaling: enable REDIS_URL so all nodes share room membership via @socket.io/redis-adapter.
 */
export function registerClassroomSockets(io) {
    const chatService = new ChatService();
    const liveClasses = new LiveClassRepository();
    const attendance = new AttendanceRepository();
    const typingByClass = new Map();
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.query?.token;
            if (!token || typeof token !== "string") {
                return next(new Error("Unauthorized"));
            }
            const user = verifyAccessToken(token);
            socket.data.user = user;
            next();
        }
        catch {
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        const user = socket.data.user;
        socket.on("classroom:join", async (liveClassId, ack) => {
            try {
                await assertSocketClassAccess(user, liveClassId, liveClasses);
                await socket.join(roomName(liveClassId));
                ack?.(null);
            }
            catch (e) {
                logger.warn({ e, liveClassId }, "classroom:join denied");
                ack?.(e instanceof Error ? e : new Error("join failed"));
            }
        });
        socket.on("classroom:leave", (liveClassId) => {
            void socket.leave(roomName(liveClassId));
        });
        socket.on("chat:send", async (payload, ack) => {
            try {
                const msg = await chatService.persistMessage(user, payload.liveClassId, payload.body);
                io.to(roomName(payload.liveClassId)).emit("chat:message", {
                    id: msg.id,
                    liveClassId: payload.liveClassId,
                    userId: user.sub,
                    body: msg.body,
                    createdAt: msg.createdAt,
                });
                ack?.(null, msg);
            }
            catch (e) {
                ack?.(e instanceof Error ? e : new Error("send failed"));
            }
        });
        socket.on("chat:typing", (payload) => {
            const key = payload.liveClassId;
            if (!typingByClass.has(key))
                typingByClass.set(key, new Set());
            const set = typingByClass.get(key);
            if (payload.typing)
                set.add(user.sub);
            else
                set.delete(user.sub);
            socket.to(roomName(key)).emit("chat:typing", {
                userId: user.sub,
                typing: payload.typing,
                liveClassId: key,
            });
        });
        socket.on("attendance:ping", async (liveClassId) => {
            try {
                const doc = await liveClasses.findById(liveClassId);
                if (!doc || doc.status !== "live")
                    return;
                const uid = new mongoose.Types.ObjectId(user.sub);
                let open = await attendance.findOpenSession(doc._id, uid);
                const now = new Date();
                if (!open) {
                    await attendance.createOpenSession(doc._id, uid);
                    return;
                }
                const durationSeconds = Math.max(0, Math.floor((now.getTime() - open.joinedAt.getTime()) / 1000));
                await attendance.updateOpenDuration(open.id, durationSeconds);
            }
            catch (err) {
                logger.warn({ err }, "attendance:ping failed");
            }
        });
        socket.on("hand:raise", (liveClassId) => {
            socket.to(roomName(liveClassId)).emit("hand:raised", {
                userId: user.sub,
                liveClassId,
            });
        });
        socket.on("mod:mute_all", async (liveClassId) => {
            try {
                const doc = await liveClasses.findById(liveClassId);
                if (!doc)
                    return;
                const uid = new mongoose.Types.ObjectId(user.sub);
                const can = user.role === "admin" || doc.teacherId.equals(uid);
                if (!can)
                    return;
                io.to(roomName(liveClassId)).emit("mod:mute_all", { liveClassId });
            }
            catch (err) {
                logger.warn({ err }, "mod:mute_all failed");
            }
        });
        socket.on("disconnect", () => {
            for (const set of typingByClass.values())
                set.delete(user.sub);
        });
    });
}
function roomName(liveClassId) {
    return `classroom:${liveClassId}`;
}
async function assertSocketClassAccess(user, liveClassId, liveClasses) {
    const doc = await liveClasses.findById(liveClassId);
    if (!doc)
        throw new AppError(404, "Class not found", "NOT_FOUND");
    const uid = new mongoose.Types.ObjectId(user.sub);
    const ok = user.role === "admin" ||
        doc.teacherId.equals(uid) ||
        doc.enrolledStudentIds.some((id) => id.equals(uid));
    if (!ok)
        throw new AppError(403, "Forbidden", "FORBIDDEN");
}
//# sourceMappingURL=classroom.socket.js.map