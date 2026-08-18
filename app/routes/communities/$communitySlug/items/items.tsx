import { useTranslation } from "react-i18next";

import { Link } from "~/components/link/link";
import { Table } from "~/components/table/table";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";

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

  const t = getInstance(context).getFixedT(getLocale(context), "items");

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
    select: { id: true, visibility: true },
  });
  if (!community) {
    throw new Response("Not Found", { status: 404 });
  }

  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  if (!membership && community.visibility === "private") {
    throw new Response("Not Found", { status: 404 });
  }

  const rawItems = await prisma.item.findMany({
    where: { communityId: community.id, ownerMembership: { removedAt: null } },
    select: { id: true, name: true, ownerMembershipId: true },
    orderBy: { name: "asc" },
  });

  // Never send `ownerMembershipId` to the client — it could be cross-referenced
  // against the Members list to deanonymize an item's owner.
  const items = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    isOwnItem: item.ownerMembershipId === membership?.id,
  }));

  return { title: t("meta.items"), items };
};

export default function Items({ loaderData, params }: Route.ComponentProps) {
  const { t } = useTranslation("items");
  const { items } = loaderData;
  const { communitySlug } = params;

  return (
    <div>
      <h1>{t("headings.items")}</h1>
      {items.length === 0 ? (
        <p>{t("notices.noItems")}</p>
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
