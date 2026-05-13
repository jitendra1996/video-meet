import { Router } from "express";
import { ChatController } from "./chat.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { validate } from "../../common/middleware/validate.js";
import { chatMessageBodySchema, liveClassIdParamsSchema } from "./chat.dto.js";
const r = Router();
const c = new ChatController();
r.use(authenticate);
r.get("/live-classes/:id/messages", validate("params", liveClassIdParamsSchema), c.history);
r.post("/live-classes/:id/messages", validate("params", liveClassIdParamsSchema), validate("body", chatMessageBodySchema), c.post);
export const chatRoutes = r;
//# sourceMappingURL=chat.routes.js.map