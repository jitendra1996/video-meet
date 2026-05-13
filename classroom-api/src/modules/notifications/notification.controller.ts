import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { ok } from "../../common/utils/response.js";
import { NotificationRepository } from "./notification.repository.js";
import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";

export class NotificationController {
  constructor(private readonly repo = new NotificationRepository()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const rows = await this.repo.listForUser(new mongoose.Types.ObjectId(user.sub));
    return ok(res, rows);
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const updated = await this.repo.markRead(id, new mongoose.Types.ObjectId(user.sub));
    if (!updated) throw new AppError(404, "Notification not found", "NOT_FOUND");
    return ok(res, updated);
  });
}
