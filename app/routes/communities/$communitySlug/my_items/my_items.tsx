import { useTranslation } from "react-i18next";

import { Link } from "~/components/link/link";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/my_items";

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

  const t = getInstance(context).getFixedT(getLocale(context), "items");

  const items = await prisma.item.findMany({
    where: { ownerMembershipId: found.membership.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { title: t("meta.myItems"), items };
};

export default function MyItems({ loaderData, params }: Route.ComponentProps) {
  const { t } = useTranslation("items");
  const { items } = loaderData;
  const { communitySlug } = params;

  return (
    <div>
      <h1>{t("headings.myItems")}</h1>
      <Link to={`/communities/${communitySlug}/my_items/new`}>
        {t("nav.newItem")}
      </Link>
      {items.length === 0 ? <p>{t("notices.noItemsOfYours")}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/communities/${communitySlug}/my_items/${item.id}`}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
