import crypto from "crypto";

import { prisma } from "~/db.server";

const TOKEN_EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createMagicLinkToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");

  await prisma.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      userId,
    },
  });

  return token;
}

export type ConsumeMagicLinkResult =
  | { status: "ok"; userId: string }
  | { status: "invalid" | "expired" | "used" };

export async function consumeMagicLinkToken(
  token: string,
): Promise<ConsumeMagicLinkResult> {
  const tokenHash = hashToken(token);

  const magicLink = await prisma.magicLink.findUnique({ where: { tokenHash } });

  if (!magicLink) {
    return { status: "invalid" };
  }
  if (magicLink.usedAt) {
    return { status: "used" };
  }
  if (magicLink.expiresAt < new Date()) {
    return { status: "expired" };
  }

  // Atomic conditional claim: only succeeds if no other request (including an
  // email-scanner prefetch) has already consumed this token since the read above.
  const { count } = await prisma.magicLink.updateMany({
    where: { id: magicLink.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (count === 0) {
    return { status: "used" };
  }

  return { status: "ok", userId: magicLink.userId };
}
