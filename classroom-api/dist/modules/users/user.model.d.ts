import { type Document, type Model } from "mongoose";
export type UserRole = "student" | "teacher" | "admin";
export interface IUser extends Document {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: Model<IUser>;
//# sourceMappingURL=user.model.d.ts.map