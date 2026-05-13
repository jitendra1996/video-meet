import type { Types } from "mongoose";
import { AttendanceSession, type IAttendanceSession } from "./attendance.model.js";

export class AttendanceRepository {
  async createOpenSession(liveClassId: Types.ObjectId, userId: Types.ObjectId): Promise<IAttendanceSession> {
    return AttendanceSession.create({
      liveClassId,
      userId,
      joinedAt: new Date(),
      durationSeconds: 0,
    });
  }

  async findOpenSession(
    liveClassId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IAttendanceSession | null> {
    return AttendanceSession.findOne({
      liveClassId,
      userId,
      leftAt: { $exists: false },
    })
      .sort({ joinedAt: -1 })
      .exec();
  }

  async closeSession(
    sessionId: string,
    leftAt: Date,
    durationSeconds: number
  ): Promise<IAttendanceSession | null> {
    return AttendanceSession.findByIdAndUpdate(
      sessionId,
      { leftAt, durationSeconds },
      { new: true }
    ).exec();
  }

  async listByClass(liveClassId: Types.ObjectId): Promise<IAttendanceSession[]> {
    return AttendanceSession.find({ liveClassId }).sort({ joinedAt: 1 }).exec();
  }

  /** Updates duration for an open session (presence ping) without closing it. */
  async updateOpenDuration(sessionId: string, durationSeconds: number): Promise<void> {
    await AttendanceSession.updateOne(
      { _id: sessionId, leftAt: { $exists: false } },
      { $set: { durationSeconds } }
    ).exec();
  }
}
