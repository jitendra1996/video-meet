import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { validate } from "../../common/middleware/validate.js";
import { loginSchema, registerSchema } from "./auth.dto.js";

const r = Router();
const c = new AuthController();

r.post("/register", validate("body", registerSchema), c.register);
r.post("/login", validate("body", loginSchema), c.login);
r.get("/me", authenticate, c.me);

export const authRoutes = r;
