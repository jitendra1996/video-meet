import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { created, ok } from "../../common/utils/response.js";
import { LiveClassService } from "./live-class.service.js";
import type {
  CreateLiveClassInput,
  ScheduleLiveClassInput,
} from "./live-class.dto.js";
import { AppError } from "../../common/errors/AppError.js";

export class LiveClassController {
  constructor(private readonly service = new LiveClassService()) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const body = req.body as CreateLiveClassInput;
    const doc = await this.service.create(user, body);
    return created(res, doc);
  });

  schedule = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const body = req.body as ScheduleLiveClassInput;
    const doc = await this.service.schedule(user, id, body);
    return ok(res, doc);
  });

  start = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const doc = await this.service.start(user, id);
    return ok(res, doc);
  });

  end = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const doc = await this.service.end(user, id);
    return ok(res, doc);
  });

  enroll = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const { studentId } = req.body as { studentId: string };
    const doc = await this.service.enroll(user, id, studentId);
    return ok(res, doc);
  });

  join = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const creds = await this.service.join(user, id);
    return ok(res, creds);
  });

  leave = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    await this.service.leave(user, id);
    return ok(res, { ok: true });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const rows = await this.service.list(user);
    return ok(res, rows);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const doc = await this.service.getById(user, id);
    return ok(res, doc);
  });

  removeParticipant = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    const { id } = req.params as { id: string };
    const { peerId } = req.body as { peerId: string };
    await this.service.removeParticipant(user, id, peerId);
    return ok(res, { ok: true });
  });
}
