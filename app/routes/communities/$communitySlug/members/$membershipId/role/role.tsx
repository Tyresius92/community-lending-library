import { data, redirect } from "react-router";

import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { communityMembershipRoleChangeSchema } from "~/schemas/community_membership";
import { getUserId, loginRedirect } from "~/session.server";
import {
  getCommunityMembership,
  meetsMinRole,
} from "~/utils/community_role.server";

import type { Route } from "./+types/role";

export const action = async ({
  params,
  request,
  context,
  url,
}: Route.ActionArgs) => {
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

  if (target.role === "owner" || target.userId === userId) {
    return new Response(null, { status: 403 });
  }

  const t = getInstance(context).getFixedT(getLocale(context), "members");

  const formData = await request.formData();
  const result = communityMembershipRoleChangeSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!result.success) {
    return data({ error: t("errors.roleInvalid") }, { status: 400 });
  }

  await prisma.communityMembership.update({
    where: { id: target.id },
    data: { role: result.data.role },
  });

  return redirect(`/communities/${params.communitySlug}/members`);
};
