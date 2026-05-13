import { z } from "zod";

export const chatMessageBodySchema = z.object({
  body: z.string().min(1).max(4000),
});

export const liveClassIdParamsSchema = z.object({
  id: z.string().min(1),
});
