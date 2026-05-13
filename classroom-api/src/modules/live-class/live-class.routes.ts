import { Router } from "express";
import { LiveClassController } from "./live-class.controller.js";
import { authenticate, requireRoles } from "../../common/middleware/auth.middleware.js";
import { validate } from "../../common/middleware/validate.js";
import {
  createLiveClassSchema,
  enrollStudentSchema,
  liveClassIdParamSchema,
  removePeerSchema,
  scheduleLiveClassSchema,
} from "./live-class.dto.js";

const r = Router();
const c = new LiveClassController();

r.use(authenticate);

r.get("/", c.list);

r.post(
  "/",
  requireRoles("teacher", "admin"),
  validate("body", createLiveClassSchema),
  c.create
);

r.patch(
  "/:id/schedule",
  requireRoles("teacher", "admin"),
  validate("params", liveClassIdParamSchema),
  validate("body", scheduleLiveClassSchema),
  c.schedule
);

r.post(
  "/:id/start",
  requireRoles("teacher", "admin"),
  validate("params", liveClassIdParamSchema),
  c.start
);

r.post(
  "/:id/end",
  requireRoles("teacher", "admin"),
  validate("params", liveClassIdParamSchema),
  c.end
);

r.post(
  "/:id/enroll",
  requireRoles("teacher", "admin"),
  validate("params", liveClassIdParamSchema),
  validate("body", enrollStudentSchema),
  c.enroll
);

r.post(
  "/:id/join",
  validate("params", liveClassIdParamSchema),
  c.join
);

r.post(
  "/:id/leave",
  validate("params", liveClassIdParamSchema),
  c.leave
);

r.post(
  "/:id/participants/remove",
  requireRoles("teacher", "admin"),
  validate("params", liveClassIdParamSchema),
  validate("body", removePeerSchema),
  c.removeParticipant
);

r.get("/:id", validate("params", liveClassIdParamSchema), c.get);

export const liveClassRoutes = r;
