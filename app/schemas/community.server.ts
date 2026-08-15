import { z } from "zod";

import { SLUG_PATTERN } from "~/utils";

const communityBaseSchema = z.object({
  name: z.string().trim().min(1, "NAME_REQUIRED"),
  // min/max/regex all collapse to the same code — there's only ever one
  // "your slug is malformed" message, regardless of which check caught it.
  slug: z
    .string()
    .min(3, "SLUG_PATTERN")
    .max(50, "SLUG_PATTERN")
    .regex(SLUG_PATTERN, "SLUG_PATTERN"),
  description: z.string().trim(),
  visibility: z.enum(["public", "private"], "VISIBILITY_INVALID"),
  joinPolicy: z.enum(["open", "invite_only"], "JOIN_POLICY_INVALID"),
  displayName: z.string().trim().min(1, "DISPLAY_NAME_REQUIRED"),
});

export const communityCreateSchema = communityBaseSchema;
export const communityJoinSchema = communityBaseSchema.pick({
  displayName: true,
});

export type CommunityErrorCode =
  | "NAME_REQUIRED"
  | "SLUG_PATTERN"
  | "VISIBILITY_INVALID"
  | "JOIN_POLICY_INVALID"
  | "DISPLAY_NAME_REQUIRED"
  // Emitted by the route after a DB uniqueness check, not by Zod — included
  // here so a route's `messages` map still has to account for it.
  | "SLUG_TAKEN";

export const isCommunityErrorCode = (
  value: string,
): value is CommunityErrorCode =>
  [
    "NAME_REQUIRED",
    "SLUG_PATTERN",
    "VISIBILITY_INVALID",
    "JOIN_POLICY_INVALID",
    "DISPLAY_NAME_REQUIRED",
    "SLUG_TAKEN",
  ].includes(value);
