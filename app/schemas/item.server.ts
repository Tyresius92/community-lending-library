import { z } from "zod";

import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "~/schemas/item_constants";

const itemBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "NAME_REQUIRED")
    .max(NAME_MAX_LENGTH, "NAME_TOO_LONG"),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, "DESCRIPTION_TOO_LONG"),
});

// Identical shapes today — aliased, not artificially diverged. Split with
// .extend()/.omit() if a future field only applies to one flow.
export const itemCreateSchema = itemBaseSchema;
export const itemEditSchema = itemBaseSchema;

export type ItemErrorCode =
  | "NAME_REQUIRED"
  | "NAME_TOO_LONG"
  | "DESCRIPTION_TOO_LONG";

export const isItemErrorCode = (value: string): value is ItemErrorCode =>
  ["NAME_REQUIRED", "NAME_TOO_LONG", "DESCRIPTION_TOO_LONG"].includes(value);
