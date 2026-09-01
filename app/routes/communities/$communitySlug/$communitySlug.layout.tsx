import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";

import { Link } from "~/components/link/link";
import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";
import { meetsMinRole } from "~/utils/community_role.server";

import type { Route } from "./+types/$communitySlug.layout";

export const loader = async ({ params, request, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
    select: { id: true, name: true, slug: true, visibility: true },
  });
  if (!community) {
    throw new Response("Not Found", { status: 404 });
  }

  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
    select: { removedAt: true, role: true },
  });

  if (membership?.removedAt) {
    throw new Response("Not Found", { status: 404 });
  }

  if (community.visibility === "private" && !membership) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    community,
    canManageInvites: membership
      ? meetsMinRole(membership.role, "admin")
      : false,
  };
};

export default function CommunityLayout({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("communities");
  const { slug } = loaderData.community;
  const { canManageInvites } = loaderData;

  return (
    <main>
      <header>
        <h1>{loaderData.community.name}</h1>
        <nav aria-label={t("nav.communitySections")}>
          <ul>
            <li>
              <Link to={`/communities/${slug}`}>{t("nav.overview")}</Link>
            </li>
            <li>
              <Link to={`/communities/${slug}/items`}>{t("nav.items")}</Link>
            </li>
            <li>
              <Link to={`/communities/${slug}/my_items`}>
                {t("nav.myItems")}
              </Link>
            </li>
            <li>
              <Link to={`/communities/${slug}/members`}>
                {t("nav.members")}
              </Link>
            </li>
            <li>
              <Link to={`/communities/${slug}/loans`}>{t("nav.loans")}</Link>
            </li>
            {canManageInvites ? (
              <li>
                <Link to={`/communities/${slug}/invite`}>
                  {t("nav.invite")}
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </header>
      <Outlet />
    </main>
  );
}

export function ErrorBoundary() {
  const { t } = useTranslation("communities");
  const error = useRouteError();

  if (error instanceof Error) {
    return (
      <div>{t("errors.unexpectedWithMessage", { message: error.message })}</div>
    );
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>{t("errors.unknown")}</h1>;
  }

  if (error.status === 404) {
    return <div>{t("errors.notFound")}</div>;
  }

  if (error.status === 403) {
    return <div>{t("errors.forbidden")}</div>;
  }

  return (
    <div>
      {t("errors.unexpectedWithMessage", { message: error.statusText })}
    </div>
  );
}
