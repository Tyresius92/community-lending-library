import { describe, expect, it } from "vitest";

import { communityMembershipRoleChangeSchema } from "./community_membership";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

describe("communityMembershipRoleChangeSchema", () => {
  it.each([
    { name: "accepts member", entries: { role: "member" } },
    { name: "accepts admin", entries: { role: "admin" } },
  ] as const)("$name", ({ entries }) => {
    const result = communityMembershipRoleChangeSchema.safeParse(
      Object.fromEntries(buildFormData(entries)),
    );

    expect(result.success).toBe(true);
  });

  it.each([
    { name: "rejects owner", entries: { role: "owner" } },
    { name: "rejects an empty role", entries: { role: "" } },
    { name: "rejects an arbitrary string", entries: { role: "superadmin" } },
  ] as const)("$name", ({ entries }) => {
    const result = communityMembershipRoleChangeSchema.safeParse(
      Object.fromEntries(buildFormData(entries)),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("ROLE_INVALID");
  });
});
