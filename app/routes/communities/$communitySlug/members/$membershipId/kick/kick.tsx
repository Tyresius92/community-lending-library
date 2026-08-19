import { redirect } from "react-router";

import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";
import {
  getCommunityMembership,
  meetsMinRole,
} from "~/utils/community_role.server";

import type { Route } from "./+types/kick";

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

  const target = await prisma.communityMembership.findFirst({
    where: {
      id: params.membershipId,
      communityId: found.community.id,
      removedAt: null,
    },
  });
  if (!target) {
    throw new Response("Not Found", { status: 404 });
  }

  // The owner can't be removed here (ownership transfer is a separate,
  // not-yet-built flow), and a viewer can never remove themselves — both
  // enforced here, not just hidden client-side.
  if (target.role === "owner" || target.userId === userId) {
    return new Response(null, { status: 403 });
  }

  await prisma.communityMembership.update({
    where: { id: target.id },
    data: { removedAt: new Date(), removedById: userId },
  });

  return redirect(`/communities/${params.communitySlug}/members`);
};
