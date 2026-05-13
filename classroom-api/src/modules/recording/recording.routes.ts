import { Router } from "express";
import { RecordingController } from "./recording.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { validate } from "../../common/middleware/validate.js";
import { recordingIdParamSchema, recordingListQuerySchema } from "./recording.dto.js";

const r = Router();
const c = new RecordingController();

r.use(authenticate);

r.get("/", validate("query", recordingListQuerySchema), c.list);
r.get("/:id/play-url", validate("params", recordingIdParamSchema), c.playUrl);

export const recordingRoutes = r;
