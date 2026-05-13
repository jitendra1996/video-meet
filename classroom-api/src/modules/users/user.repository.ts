import type { FilterQuery } from "mongoose";
import { User, type IUser, type UserRole } from "./user.model.js";

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).exec();
  }

  async findByEmail(email: string, withPassword = false): Promise<IUser | null> {
    const q = User.findOne({ email: email.toLowerCase() });
    if (withPassword) q.select("+passwordHash");
    return q.exec();
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
  }): Promise<IUser> {
    return User.create(data);
  }

  async list(filter: FilterQuery<IUser> = {}, limit = 100): Promise<IUser[]> {
    return User.find(filter).limit(limit).sort({ createdAt: -1 }).exec();
  }
}
