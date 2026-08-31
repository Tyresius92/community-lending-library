import { z } from "zod";

export type ExpiryPresetDays = 1 | 7 | 30 | 90 | undefined;

function toExpiryPresetDays(
  value: "1" | "7" | "30" | "90" | "",
): ExpiryPresetDays {
  switch (value) {
    case "1":
      return 1;
    case "7":
      return 7;
    case "30":
      return 30;
    case "90":
      return 90;
    case "":
      return undefined;
  }
}

export const inviteTokenGenerateSchema = z.object({
  expiryPreset: z
    .enum(["1", "7", "30", "90", ""], "EXPIRY_INVALID")
    .transform(toExpiryPresetDays),
});

export type InviteTokenErrorCode = "EXPIRY_INVALID";

export const isInviteTokenErrorCode = (
  value: string,
): value is InviteTokenErrorCode => value === "EXPIRY_INVALID";

export function computeExpiresAt(
  days: ExpiryPresetDays,
  now: Date = new Date(),
): Date | null {
  if (days === undefined) {
    return null;
  }
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
