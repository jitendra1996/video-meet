import type { FilterQuery, Types, UpdateQuery } from "mongoose";
import { LiveClass, type ILiveClass, type LiveClassStatus } from "./live-class.model.js";

export class LiveClassRepository {
  async findById(id: string): Promise<ILiveClass | null> {
    return LiveClass.findById(id).exec();
  }

  async create(data: Partial<ILiveClass>): Promise<ILiveClass> {
    return LiveClass.create(data);
  }

  async updateById(id: string, patch: UpdateQuery<ILiveClass>): Promise<ILiveClass | null> {
    return LiveClass.findByIdAndUpdate(id, patch, { new: true }).exec();
  }

  async listForUser(userId: Types.ObjectId, role: string): Promise<ILiveClass[]> {
    const filter: FilterQuery<ILiveClass> =
      role === "teacher"
        ? { teacherId: userId }
        : role === "admin"
          ? {}
          : { enrolledStudentIds: userId };
    return LiveClass.find(filter).sort({ scheduledStart: -1, createdAt: -1 }).limit(200).exec();
  }

  async setStatus(id: string, status: LiveClassStatus, extra?: Partial<ILiveClass>): Promise<ILiveClass | null> {
    return LiveClass.findByIdAndUpdate(id, { status, ...extra }, { new: true }).exec();
  }
}
