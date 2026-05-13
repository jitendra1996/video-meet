import { z } from "zod";

export const createLiveClassSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  recordingEnabled: z.boolean().optional(),
});

export const scheduleLiveClassSchema = z.object({
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date().optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().min(1),
});

export const liveClassIdParamSchema = z.object({
  id: z.string().min(1),
});

export const removePeerSchema = z.object({
  peerId: z.string().min(1),
});

export type CreateLiveClassInput = z.infer<typeof createLiveClassSchema>;
export type ScheduleLiveClassInput = z.infer<typeof scheduleLiveClassSchema>;
