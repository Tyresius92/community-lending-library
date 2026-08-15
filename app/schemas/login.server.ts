import { z } from "zod";

const loginBaseSchema = z.object({
  // Empty and malformed both collapse to one code — matches today's single
  // "Email is invalid" message for both cases.
  email: z.email("EMAIL_INVALID"),
});

export const loginSchema = loginBaseSchema;

export type LoginErrorCode = "EMAIL_INVALID";
