import { useTranslation } from "react-i18next";

import { Link } from "~/components/link/link";
import { Table } from "~/components/table/table";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/items";

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

  const mine = url.searchParams.get("mine") === "true";

  const rawItems = await prisma.item.findMany({
    where: mine
      ? { ownerMembershipId: found.membership.id }
      : {
          communityId: found.community.id,
          ownerMembership: { removedAt: null },
        },
    select: { id: true, name: true, ownerMembershipId: true },
    orderBy: { name: "asc" },
  });

  // Never send `ownerMembershipId` to the client — it could be cross-referenced
  // against the Members list to deanonymize an item's owner.
  const items = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    isOwnItem: item.ownerMembershipId === found.membership.id,
  }));

  return { title: t("meta.items"), mine, items };
};

export default function Items({ loaderData, params }: Route.ComponentProps) {
  const { t } = useTranslation("items");
  const { mine, items } = loaderData;
  const { communitySlug } = params;

  return (
    <div>
      <h1>{t("headings.items")}</h1>
      <nav>
        <Link to={`/communities/${communitySlug}/items`}>
          {t("nav.allItems")}
        </Link>
        <Link to={`/communities/${communitySlug}/items?mine=true`}>
          {t("nav.myItems")}
        </Link>
      </nav>
      <Link to={`/communities/${communitySlug}/items/new`}>
        {t("nav.newItem")}
      </Link>
      {items.length === 0 ? (
        <p>{mine ? t("notices.noItemsOfYours") : t("notices.noItems")}</p>
      ) : (
        <Table caption={t("headings.items")}>
          <Table.Head>
            <Table.ColumnHeader>{t("labels.item")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.owner")}</Table.ColumnHeader>
          </Table.Head>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.id}>
                <Table.RowHeader>
                  <Link to={`/communities/${communitySlug}/items/${item.id}`}>
                    {item.name}
                  </Link>
                </Table.RowHeader>
                <Table.Cell>
                  {item.isOwnItem
                    ? t("labels.you")
                    : t("labels.ownerPlaceholder")}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  );
}
