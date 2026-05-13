import { Router } from "express";
import { AttendanceController } from "./attendance.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { validate } from "../../common/middleware/validate.js";
import { liveClassIdParamsSchema } from "../chat/chat.dto.js";

const r = Router();
const c = new AttendanceController();

r.use(authenticate);

r.get(
  "/live-classes/:id/attendance",
  validate("params", liveClassIdParamsSchema),
  c.summary
);

r.get(
  "/live-classes/:id/attendance/export.csv",
  validate("params", liveClassIdParamsSchema),
  c.exportCsv
);

export const attendanceRoutes = r;
