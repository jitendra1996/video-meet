import { z } from "zod";
export declare const createLiveClassSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    recordingEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description?: string | undefined;
    recordingEnabled?: boolean | undefined;
}, {
    title: string;
    description?: string | undefined;
    recordingEnabled?: boolean | undefined;
}>;
export declare const scheduleLiveClassSchema: z.ZodObject<{
    scheduledStart: z.ZodDate;
    scheduledEnd: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    scheduledStart: Date;
    scheduledEnd?: Date | undefined;
}, {
    scheduledStart: Date;
    scheduledEnd?: Date | undefined;
}>;
export declare const enrollStudentSchema: z.ZodObject<{
    studentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    studentId: string;
}, {
    studentId: string;
}>;
export declare const liveClassIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const removePeerSchema: z.ZodObject<{
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    peerId: string;
}, {
    peerId: string;
}>;
export type CreateLiveClassInput = z.infer<typeof createLiveClassSchema>;
export type ScheduleLiveClassInput = z.infer<typeof scheduleLiveClassSchema>;
//# sourceMappingURL=live-class.dto.d.ts.map