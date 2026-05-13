import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { ok } from "../../common/utils/response.js";
import { RecordingService } from "./recording.service.js";
import { AppError } from "../../common/errors/AppError.js";

export class RecordingController {
  constructor(private readonly service = new RecordingService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { liveClassId } = req.query as { liveClassId: string };
    const rows = await this.service.list(user, liveClassId);
    return ok(res, rows);
  });

  playUrl = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const data = await this.service.playbackUrl(user, id);
    return ok(res, data);
  });
}
