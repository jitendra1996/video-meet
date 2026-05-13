import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { HmsService } from "../../integrations/hms/hms.service.js";
import { LiveClassRepository } from "./live-class.repository.js";
import { AttendanceRepository } from "../attendance/attendance.repository.js";
import { NotificationRepository } from "../notifications/notification.repository.js";
import { RecordingRepository } from "../recording/recording.repository.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";
import type { CreateLiveClassInput, ScheduleLiveClassInput } from "./live-class.dto.js";
import type { ILiveClass } from "./live-class.model.js";

export class LiveClassService {
  constructor(
    private readonly liveClasses = new LiveClassRepository(),
    private readonly attendance = new AttendanceRepository(),
    private readonly notifications = new NotificationRepository(),
    private readonly recordings = new RecordingRepository(),
    private readonly hms = new HmsService()
  ) {}

  async create(user: AccessTokenPayload, input: CreateLiveClassInput): Promise<ILiveClass> {
    const room = await this.hms.createRoom({
      name: `class-${user.sub}-${Date.now()}`,
      description: input.title,
      recordingEnabled: input.recordingEnabled ?? true,
    });
    return this.liveClasses.create({
      title: input.title,
      description: input.description,
      teacherId: new mongoose.Types.ObjectId(user.sub),
      enrolledStudentIds: [],
      hmsRoomId: room.id,
      status: "draft",
      recordingEnabled: input.recordingEnabled ?? true,
    });
  }

  async schedule(
    user: AccessTokenPayload,
    classId: string,
    input: ScheduleLiveClassInput
  ): Promise<ILiveClass> {
    const doc = await this.requireClass(classId);
    this.assertCanManage(user, doc);
    if (input.scheduledEnd && input.scheduledEnd <= input.scheduledStart) {
      throw new AppError(400, "scheduledEnd must be after scheduledStart", "INVALID_SCHEDULE");
    }
    const updated = await this.liveClasses.updateById(classId, {
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      status: "scheduled",
    });
    if (!updated) throw new AppError(404, "Class not found", "NOT_FOUND");
    return updated;
  }

  async start(user: AccessTokenPayload, classId: string): Promise<ILiveClass> {
    const doc = await this.requireClass(classId);
    this.assertCanManage(user, doc);
    const updated = await this.liveClasses.updateById(classId, {
      status: "live",
      startedAt: new Date(),
    });
    if (!updated) throw new AppError(404, "Class not found", "NOT_FOUND");
    if (updated.recordingEnabled) {
      await this.recordings.create({
        liveClassId: updated._id,
        status: "processing",
      });
      void this.hms.startRecording(updated.hmsRoomId);
    }
    return updated;
  }

  async end(user: AccessTokenPayload, classId: string): Promise<ILiveClass> {
    const doc = await this.requireClass(classId);
    this.assertCanManage(user, doc);
    await this.reconcileOpenAttendance(classId);
    const updated = await this.liveClasses.updateById(classId, {
      status: "ended",
      endedAt: new Date(),
    });
    if (!updated) throw new AppError(404, "Class not found", "NOT_FOUND");
    return updated;
  }

  async enroll(user: AccessTokenPayload, classId: string, studentId: string): Promise<ILiveClass> {
    const doc = await this.requireClass(classId);
    this.assertCanManage(user, doc);
    const sid = new mongoose.Types.ObjectId(studentId);
    if (doc.enrolledStudentIds.some((id) => id.equals(sid))) {
      return doc;
    }
    const updated = await this.liveClasses.updateById(classId, {
      $addToSet: { enrolledStudentIds: sid },
    });
    if (!updated) throw new AppError(404, "Class not found", "NOT_FOUND");
    await this.notifications.create({
      userId: sid,
      type: "enrollment",
      title: "Enrolled in live class",
      message: `You were enrolled in: ${updated.title}`,
      metadata: { liveClassId: updated.id },
    });
    return updated;
  }

  async join(user: AccessTokenPayload, classId: string): Promise<{ token: string; roomId: string }> {
    const doc = await this.requireClass(classId);
    if (doc.status !== "live") {
      throw new AppError(409, "Class is not live", "CLASS_NOT_LIVE");
    }
    const uid = new mongoose.Types.ObjectId(user.sub);
    const isTeacher = doc.teacherId.equals(uid);
    const isAdmin = user.role === "admin";
    const enrolled = doc.enrolledStudentIds.some((id) => id.equals(uid));
    if (!isTeacher && !isAdmin && !enrolled) {
      throw new AppError(403, "Not enrolled in this class", "NOT_ENROLLED");
    }
    const role =
      isTeacher || isAdmin ? env.HMS_ROLE_TEACHER : env.HMS_ROLE_STUDENT;
    const token = await this.hms.getAuthToken({
      roomId: doc.hmsRoomId,
      role,
      userId: user.sub,
    });
    const open = await this.attendance.findOpenSession(doc._id, uid);
    if (!open) {
      await this.attendance.createOpenSession(doc._id, uid);
    }
    return { token, roomId: doc.hmsRoomId };
  }

  async leave(user: AccessTokenPayload, classId: string): Promise<void> {
    const doc = await this.requireClass(classId);
    const uid = new mongoose.Types.ObjectId(user.sub);
    const open = await this.attendance.findOpenSession(doc._id, uid);
    if (!open) return;
    const leftAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((leftAt.getTime() - open.joinedAt.getTime()) / 1000)
    );
    await this.attendance.closeSession(open.id, leftAt, durationSeconds);
  }

  async list(user: AccessTokenPayload): Promise<ILiveClass[]> {
    return this.liveClasses.listForUser(
      new mongoose.Types.ObjectId(user.sub),
      user.role
    );
  }

  async getById(user: AccessTokenPayload, classId: string): Promise<ILiveClass> {
    const doc = await this.requireClass(classId);
    this.assertCanAccess(user, doc);
    return doc;
  }

  async removeParticipant(
    user: AccessTokenPayload,
    classId: string,
    peerId: string
  ): Promise<void> {
    const doc = await this.requireClass(classId);
    this.assertCanManage(user, doc);
    await this.hms.removePeer(doc.hmsRoomId, peerId);
  }

  private async requireClass(id: string): Promise<ILiveClass> {
    const doc = await this.liveClasses.findById(id);
    if (!doc) throw new AppError(404, "Class not found", "NOT_FOUND");
    return doc;
  }

  private assertCanManage(user: AccessTokenPayload, doc: ILiveClass): void {
    const uid = new mongoose.Types.ObjectId(user.sub);
    const isTeacher = doc.teacherId.equals(uid);
    if (user.role === "admin" || isTeacher) return;
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }

  private assertCanAccess(user: AccessTokenPayload, doc: ILiveClass): void {
    const uid = new mongoose.Types.ObjectId(user.sub);
    const isTeacher = doc.teacherId.equals(uid);
    const enrolled = doc.enrolledStudentIds.some((id) => id.equals(uid));
    if (user.role === "admin" || isTeacher || enrolled) return;
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }

  /** Close any sessions still open when the teacher ends the class. */
  private async reconcileOpenAttendance(classId: string): Promise<void> {
    const doc = await this.requireClass(classId);
    const sessions = await this.attendance.listByClass(doc._id);
    const end = new Date();
    for (const s of sessions) {
      if (!s.leftAt) {
        const durationSeconds = Math.max(
          0,
          Math.floor((end.getTime() - s.joinedAt.getTime()) / 1000)
        );
        await this.attendance.closeSession(s.id, end, durationSeconds);
      }
    }
  }
}
