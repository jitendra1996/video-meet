import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { created, ok } from "../../common/utils/response.js";
import { ChatService } from "./chat.service.js";
import { AppError } from "../../common/errors/AppError.js";

export class ChatController {
  constructor(private readonly service = new ChatService()) {}

  history = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const rows = await this.service.listHistory(user, id);
    return ok(res, rows);
  });

  post = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const { body } = req.body as { body: string };
    const msg = await this.service.persistMessage(user, id, body);
    return created(res, msg);
  });
}
