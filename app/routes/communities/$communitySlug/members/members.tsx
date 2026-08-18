import { useTranslation } from "react-i18next";

import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";
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
  }));

  return { title: t("meta.members"), members };
};

export default function Members({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("members");
  const { members } = loaderData;

  return (
    <div>
      <h1>{t("headings.members")}</h1>
      {members.length === 0 ? (
        <p>{t("notices.noMembers")}</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
