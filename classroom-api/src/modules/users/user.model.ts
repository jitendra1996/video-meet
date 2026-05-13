import mongoose, { Schema, type Document, type Model } from "mongoose";

export type UserRole = "student" | "teacher" | "admin";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
