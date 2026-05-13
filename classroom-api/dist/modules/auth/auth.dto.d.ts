import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<["student", "teacher", "admin"]>>;
    inviteCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    password: string;
    role?: "student" | "teacher" | "admin" | undefined;
    inviteCode?: string | undefined;
}, {
    email: string;
    name: string;
    password: string;
    role?: "student" | "teacher" | "admin" | undefined;
    inviteCode?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
//# sourceMappingURL=auth.dto.d.ts.map