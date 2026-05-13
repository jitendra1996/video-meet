import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../common/logger.js";

/** Import models so they register with Mongoose when connection opens. */
import "../modules/users/user.model.js";
import "../modules/live-class/live-class.model.js";
import "../modules/attendance/attendance.model.js";
import "../modules/chat/chat-message.model.js";
import "../modules/recording/recording.model.js";
import "../modules/notifications/notification.model.js";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
