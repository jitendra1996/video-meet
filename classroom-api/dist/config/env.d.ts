import { z } from "zod";
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    MONGODB_URI: z.ZodString;
    JWT_SECRET: z.ZodString;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    CORS_ORIGIN: z.ZodDefault<z.ZodString>;
    /** Comma-separated origins for Socket.IO (falls back to CORS_ORIGIN) */
    SOCKET_CORS_ORIGIN: z.ZodOptional<z.ZodString>;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodNumber>;
    /** Optional: enable Socket.IO Redis adapter for horizontal scaling */
    REDIS_URL: z.ZodOptional<z.ZodString>;
    /** 100ms dashboard credentials */
    HMS_ACCESS_KEY: z.ZodString;
    HMS_SECRET: z.ZodString;
    /** Template configured in 100ms with roles (e.g. host / viewer) */
    HMS_TEMPLATE_ID: z.ZodString;
    HMS_ROLE_TEACHER: z.ZodDefault<z.ZodString>;
    HMS_ROLE_STUDENT: z.ZodDefault<z.ZodString>;
    /** Auth token TTL for joining a room (seconds) */
    HMS_AUTH_TOKEN_TTL_SECONDS: z.ZodDefault<z.ZodNumber>;
    /** Optional secret to allow teacher/admin self-registration */
    TEACHER_INVITE_CODE: z.ZodOptional<z.ZodString>;
    ADMIN_INVITE_CODE: z.ZodOptional<z.ZodString>;
    /** Webhook signing secret from 100ms (if configured) */
    HMS_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    /** S3 bucket for recording assets / exports (optional until recordings exist) */
    AWS_REGION: z.ZodOptional<z.ZodString>;
    AWS_S3_BUCKET: z.ZodOptional<z.ZodString>;
    AWS_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    AWS_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    SIGNED_URL_TTL_SECONDS: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX: number;
    HMS_ACCESS_KEY: string;
    HMS_SECRET: string;
    HMS_TEMPLATE_ID: string;
    HMS_ROLE_TEACHER: string;
    HMS_ROLE_STUDENT: string;
    HMS_AUTH_TOKEN_TTL_SECONDS: number;
    SIGNED_URL_TTL_SECONDS: number;
    SOCKET_CORS_ORIGIN?: string | undefined;
    REDIS_URL?: string | undefined;
    TEACHER_INVITE_CODE?: string | undefined;
    ADMIN_INVITE_CODE?: string | undefined;
    HMS_WEBHOOK_SECRET?: string | undefined;
    AWS_REGION?: string | undefined;
    AWS_S3_BUCKET?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    HMS_ACCESS_KEY: string;
    HMS_SECRET: string;
    HMS_TEMPLATE_ID: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    JWT_EXPIRES_IN?: string | undefined;
    CORS_ORIGIN?: string | undefined;
    SOCKET_CORS_ORIGIN?: string | undefined;
    RATE_LIMIT_WINDOW_MS?: number | undefined;
    RATE_LIMIT_MAX?: number | undefined;
    REDIS_URL?: string | undefined;
    HMS_ROLE_TEACHER?: string | undefined;
    HMS_ROLE_STUDENT?: string | undefined;
    HMS_AUTH_TOKEN_TTL_SECONDS?: number | undefined;
    TEACHER_INVITE_CODE?: string | undefined;
    ADMIN_INVITE_CODE?: string | undefined;
    HMS_WEBHOOK_SECRET?: string | undefined;
    AWS_REGION?: string | undefined;
    AWS_S3_BUCKET?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
    SIGNED_URL_TTL_SECONDS?: number | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare const env: {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX: number;
    HMS_ACCESS_KEY: string;
    HMS_SECRET: string;
    HMS_TEMPLATE_ID: string;
    HMS_ROLE_TEACHER: string;
    HMS_ROLE_STUDENT: string;
    HMS_AUTH_TOKEN_TTL_SECONDS: number;
    SIGNED_URL_TTL_SECONDS: number;
    SOCKET_CORS_ORIGIN?: string | undefined;
    REDIS_URL?: string | undefined;
    TEACHER_INVITE_CODE?: string | undefined;
    ADMIN_INVITE_CODE?: string | undefined;
    HMS_WEBHOOK_SECRET?: string | undefined;
    AWS_REGION?: string | undefined;
    AWS_S3_BUCKET?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
};
export {};
//# sourceMappingURL=env.d.ts.map