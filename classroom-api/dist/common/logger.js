import pino from "pino";
import { env } from "../config/env.js";
/** Structured JSON logs (ship to your log aggregator in production). */
export const logger = pino({
    level: env.NODE_ENV === "production" ? "info" : "debug",
});
//# sourceMappingURL=logger.js.map