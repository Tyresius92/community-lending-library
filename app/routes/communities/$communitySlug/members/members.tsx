import { useTranslation } from "react-i18next";
import { data, redirect } from "react-router";

import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { communityMembershipRoleChangeSchema } from "~/schemas/community_membership";
import { getUserId, loginRedirect } from "~/session.server";
import {
  getCommunityMembership,
  meetsMinRole,
} from "~/utils/community_role.server";
import { getCompletedLendCounts } from "~/utils/lend_count.server";

import type { Route } from "./+types/members";
import { MemberCard } from "./member_card";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
];

export const loader = async ({
  params,
  request,
  context,
  url,
}: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  const t = getInstance(context).getFixedT(getLocale(context), "members");
  const dateFormatter = new Intl.DateTimeFormat(getLocale(context), {
    dateStyle: "medium",
  });

  const memberships = await prisma.communityMembership.findMany({
    where: { communityId: found.community.id, removedAt: null },
    select: {
      id: true,
      userId: true,
      displayName: true,
      role: true,
      joinedAt: true,
    },
    orderBy: { displayName: "asc" },
  });

  const lendCounts = await getCompletedLendCounts(
    found.community.id,
    memberships.map((membership) => membership.userId),
  );

  const members = memberships.map((membership) => ({
    id: membership.id,
    displayName: membership.displayName,
    role: membership.role,
    memberSince: dateFormatter.format(membership.joinedAt),
    lendCount: lendCounts.get(membership.userId) ?? 0,
    isSelf: membership.userId === userId,
  }));

  return {
    title: t("meta.members"),
    members,
    canManage: meetsMinRole(found.membership.role, "admin"),
  };
};

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

  const formData = await request.formData();
  const intent = formData.get("intent");
  const membershipId = formData.get("membershipId");
  if (typeof membershipId !== "string") {
    throw new Response("Bad Request", { status: 400 });
  }

  const target = await prisma.communityMembership.findFirst({
    where: {
      id: membershipId,
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

  switch (intent) {
    case "changeRole": {
      const t = getInstance(context).getFixedT(getLocale(context), "members");
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
    }
    case "kick": {
      await prisma.communityMembership.update({
        where: { id: target.id },
        data: { removedAt: new Date(), removedById: userId },
      });

      return redirect(`/communities/${params.communitySlug}/members`);
    }
    default:
      throw new Response("Bad Request", { status: 400 });
  }
};

export default function Members({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("members");
  const { members, canManage } = loaderData;

  return (
    <div>
      <h1>{t("headings.members")}</h1>
      {members.length === 0 ? (
        <p>{t("notices.noMembers")}</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} canManage={canManage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
