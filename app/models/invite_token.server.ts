import { prisma } from "~/db.server";

export type ValidateInviteTokenResult =
  | {
      status: "ok";
      community: { id: string; slug: string; name: string };
    }
  | { status: "invalid" | "expired" | "revoked" };

export async function validateInviteToken(
  token: string,
): Promise<ValidateInviteTokenResult> {
  const inviteToken = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      community: {
        select: { id: true, slug: true, name: true, archivedAt: true },
      },
    },
  });

  if (!inviteToken) {
    return { status: "invalid" };
  }
  if (inviteToken.revokedAt) {
    return { status: "revoked" };
  }
  if (inviteToken.community.archivedAt) {
    return { status: "invalid" };
  }
  if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
    return { status: "expired" };
  }

  const { id, slug, name } = inviteToken.community;
  return { status: "ok", community: { id, slug, name } };
}
