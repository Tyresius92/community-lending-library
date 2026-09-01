import { redirect } from "react-router";

import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";
import {
  getCommunityMembership,
  meetsMinRole,
} from "~/utils/community_role.server";

import type { Route } from "./+types/revoke";

export const action = async ({ params, request, url }: Route.ActionArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  if (!meetsMinRole(found.membership.role, "admin")) {
    return new Response(null, { status: 403 });
  }

  const target = await prisma.inviteToken.findFirst({
    where: {
      id: params.inviteTokenId,
      communityId: found.community.id,
      revokedAt: null,
    },
  });
  if (!target) {
    throw new Response("Not Found", { status: 404 });
  }

  await prisma.inviteToken.update({
    where: { id: target.id },
    data: { revokedAt: new Date(), revokedByUserId: userId },
  });

  return redirect(`/communities/${params.communitySlug}/invite`);
};
