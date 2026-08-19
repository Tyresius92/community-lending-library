import { z } from "zod";

export const communityMembershipRoleChangeSchema = z.object({
  role: z.enum(["member", "admin"], "ROLE_INVALID"),
});

export type CommunityMembershipErrorCode = "ROLE_INVALID";

export const isCommunityMembershipErrorCode = (
  value: string,
): value is CommunityMembershipErrorCode => value === "ROLE_INVALID";
