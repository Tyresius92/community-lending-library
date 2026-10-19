import { z } from "zod";

export const BODY_MAX_LENGTH = 2000;

export const messageCreateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "BODY_REQUIRED")
    .max(BODY_MAX_LENGTH, "BODY_TOO_LONG"),
});

export type MessageErrorCode = "BODY_REQUIRED" | "BODY_TOO_LONG";

export const isMessageErrorCode = (value: string): value is MessageErrorCode =>
  ["BODY_REQUIRED", "BODY_TOO_LONG"].includes(value);
