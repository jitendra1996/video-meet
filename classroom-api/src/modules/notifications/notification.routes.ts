import { Router } from "express";
import { NotificationController } from "./notification.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { z } from "zod";
import { validate } from "../../common/middleware/validate.js";

const idParam = z.object({ id: z.string().min(1) });

const r = Router();
const c = new NotificationController();

r.use(authenticate);

r.get("/", c.list);
r.patch("/:id/read", validate("params", idParam), c.markRead);

export const notificationRoutes = r;
