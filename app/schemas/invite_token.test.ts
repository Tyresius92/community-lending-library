import { describe, expect, it } from "vitest";

import { computeExpiresAt, inviteTokenGenerateSchema } from "./invite_token";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

describe("inviteTokenGenerateSchema", () => {
  it.each([
    {
      name: "accepts and converts 1 day",
      entries: { expiryPreset: "1" },
      expectedDays: 1,
    },
    {
      name: "accepts and converts 7 days",
      entries: { expiryPreset: "7" },
      expectedDays: 7,
    },
    {
      name: "accepts and converts 30 days",
      entries: { expiryPreset: "30" },
      expectedDays: 30,
    },
    {
      name: "accepts and converts 90 days",
      entries: { expiryPreset: "90" },
      expectedDays: 90,
    },
    {
      name: "accepts and converts no expiry",
      entries: { expiryPreset: "" },
      expectedDays: undefined,
    },
  ] as const)("$name", ({ entries, expectedDays }) => {
    const result = inviteTokenGenerateSchema.safeParse(
      Object.fromEntries(buildFormData(entries)),
    );

    expect(result.success).toBe(true);
    expect(result.data?.expiryPreset).toBe(expectedDays);
  });

  it.each([
    { name: "rejects an arbitrary string", entries: { expiryPreset: "14" } },
    { name: "rejects a negative preset", entries: { expiryPreset: "-1" } },
  ] as const)("$name", ({ entries }) => {
    const result = inviteTokenGenerateSchema.safeParse(
      Object.fromEntries(buildFormData(entries)),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("EXPIRY_INVALID");
  });
});

describe("computeExpiresAt", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it.each([
    { name: "1 day", days: 1 },
    { name: "7 days", days: 7 },
    { name: "30 days", days: 30 },
    { name: "90 days", days: 90 },
  ] as const)("adds $name", ({ days }) => {
    const result = computeExpiresAt(days, now);

    expect(result).toEqual(
      new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
    );
  });

  it("returns null for no expiry", () => {
    expect(computeExpiresAt(undefined, now)).toBeNull();
  });
});
