import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import { AttendanceSession } from "./attendance.model.js";
import { LiveClassRepository } from "../live-class/live-class.repository.js";
import type { AccessTokenPayload } from "../../common/utils/jwt.js";

export type AttendanceSummaryRow = {
  userId: string;
  name: string;
  email: string;
  totalSeconds: number;
  attendancePercent: number;
};

export class AttendanceService {
  constructor(private readonly liveClasses = new LiveClassRepository()) {}

  /** Expected session length in seconds (for percentage), from actual or scheduled window. */
  private plannedSeconds(classDoc: {
    startedAt?: Date;
    endedAt?: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  }): number {
    if (classDoc.startedAt && classDoc.endedAt) {
      return Math.max(
        60,
        Math.floor((classDoc.endedAt.getTime() - classDoc.startedAt.getTime()) / 1000)
      );
    }
    if (classDoc.scheduledStart && classDoc.scheduledEnd) {
      return Math.max(
        60,
        Math.floor((classDoc.scheduledEnd.getTime() - classDoc.scheduledStart.getTime()) / 1000)
      );
    }
    return 3600;
  }

  async summary(
    user: AccessTokenPayload,
    liveClassId: string
  ): Promise<{ plannedSeconds: number; rows: AttendanceSummaryRow[] }> {
    const doc = await this.liveClasses.findById(liveClassId);
    if (!doc) throw new AppError(404, "Class not found", "NOT_FOUND");
    const uid = new mongoose.Types.ObjectId(user.sub);
    const canSee =
      user.role === "admin" ||
      doc.teacherId.equals(uid) ||
      doc.enrolledStudentIds.some((id) => id.equals(uid));
    if (!canSee) throw new AppError(403, "Forbidden", "FORBIDDEN");

    const planned = this.plannedSeconds(doc);

    type AggRow = {
      _id: mongoose.Types.ObjectId;
      totalSeconds: number;
      user: { name: string; email: string };
    };

    const agg = await AttendanceSession.aggregate<AggRow>([
      { $match: { liveClassId: new mongoose.Types.ObjectId(liveClassId) } },
      {
        $group: {
          _id: "$userId",
          totalSeconds: { $sum: "$durationSeconds" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user" } },
      { $sort: { totalSeconds: -1 } },
    ]);

    const rows: AttendanceSummaryRow[] = agg.map((a) => {
      const pct = Math.min(100, Math.round((a.totalSeconds / planned) * 100));
      return {
        userId: a._id.toString(),
        name: a.user.name,
        email: a.user.email,
        totalSeconds: a.totalSeconds,
        attendancePercent: pct,
      };
    });

    return { plannedSeconds: planned, rows };
  }

  toCsv(rows: AttendanceSummaryRow[]): string {
    const header = "userId,name,email,totalSeconds,attendancePercent\n";
    const body = rows
      .map(
        (r) =>
          `${r.userId},${escapeCsv(r.name)},${escapeCsv(r.email)},${r.totalSeconds},${r.attendancePercent}`
      )
      .join("\n");
    return header + body;
  }
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
