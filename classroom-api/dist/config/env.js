import { config as loadEnv } from "dotenv";
import { z } from "zod";
loadEnv();
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default("15m"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    /** Comma-separated origins for Socket.IO (falls back to CORS_ORIGIN) */
    SOCKET_CORS_ORIGIN: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().default(200),
    /** Optional: enable Socket.IO Redis adapter for horizontal scaling */
    REDIS_URL: z.string().optional(),
    /** 100ms dashboard credentials */
    HMS_ACCESS_KEY: z.string().min(1),
    HMS_SECRET: z.string().min(1),
    /** Template configured in 100ms with roles (e.g. host / viewer) */
    HMS_TEMPLATE_ID: z.string().min(1),
    HMS_ROLE_TEACHER: z.string().default("host"),
    HMS_ROLE_STUDENT: z.string().default("viewer"),
    /** Auth token TTL for joining a room (seconds) */
    HMS_AUTH_TOKEN_TTL_SECONDS: z.coerce.number().min(60).max(86400).default(3600),
    /** Optional secret to allow teacher/admin self-registration */
    TEACHER_INVITE_CODE: z.string().optional(),
    ADMIN_INVITE_CODE: z.string().optional(),
    /** Webhook signing secret from 100ms (if configured) */
    HMS_WEBHOOK_SECRET: z.string().optional(),
    /** S3 bucket for recording assets / exports (optional until recordings exist) */
    AWS_REGION: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    SIGNED_URL_TTL_SECONDS: z.coerce.number().default(3600),
});
function parseEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const msg = parsed.error.flatten().fieldErrors;
        throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
    }
    return parsed.data;
}
export const env = parseEnv();
//# sourceMappingURL=env.js.map