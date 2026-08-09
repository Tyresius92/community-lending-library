import { useTranslation } from "react-i18next";

import { Link } from "~/components/link/link";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { requireUserId } from "~/session.server";

import type { Route } from "./+types/communities";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.title },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const userId = await requireUserId(request);
  const t = getInstance(context).getFixedT(getLocale(context), "communities");

  const communities = await prisma.community.findMany({
    where: { visibility: "public", joinPolicy: "open", archivedAt: null },
    select: { id: true, name: true, slug: true, description: true },
    orderBy: { name: "asc" },
  });

  const memberships = await prisma.communityMembership.findMany({
    where: { userId },
    select: { communityId: true },
  });
  const memberOf = new Set(memberships.map((m) => m.communityId));

  return {
    title: t("meta.browseCommunities"),
    communities: communities.map((c) => ({
      ...c,
      isMember: memberOf.has(c.id),
    })),
  };
};

export default function CommunitiesDirectory({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation("communities");
  const { communities } = loaderData;

  return (
    <main>
      <h1>{t("headings.browseCommunities")}</h1>
      {communities.length === 0 ? <p>{t("empty.noCommunities")}</p> : null}
      <ul>
        {communities.map((community) => (
          <li key={community.id}>
            <h2>
              <Link to={`/communities/${community.slug}`}>
                {community.name}
              </Link>
            </h2>
            {community.description ? <p>{community.description}</p> : null}
            {community.isMember ? <p>{t("notices.alreadyMember")}</p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
