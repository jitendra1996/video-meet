import { z } from "zod";

export const recordingListQuerySchema = z.object({
  liveClassId: z.string().min(1),
});

export const recordingIdParamSchema = z.object({
  id: z.string().min(1),
});
