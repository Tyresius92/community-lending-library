import { redirect } from "react-router";

import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/delete";

export const action = async ({ params, request, url }: Route.ActionArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  const item = await prisma.item.findFirst({
    where: {
      id: params.itemId,
      communityId: found.community.id,
      ownerMembershipId: found.membership.id,
    },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  await prisma.item.delete({ where: { id: item.id } });

  return redirect(`/communities/${params.communitySlug}/my_items`);
};
