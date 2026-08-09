import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
import invariant from "tiny-invariant";

import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";

import type { Route } from "./+types/$communitySlug.layout";

export const loader = async ({ params, request, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) return loginRedirect(url);

  invariant(params.communitySlug, "communitySlug not found");

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
    select: { id: true, name: true, slug: true, visibility: true },
  });
  if (!community) {
    throw new Response("Not Found", { status: 404 });
  }

  if (community.visibility === "private") {
    const membership = await prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId: community.id } },
    });
    if (!membership) {
      throw new Response("Not Found", { status: 404 });
    }
  }

  return { community };
};

export default function CommunityLayout({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <header>
        <h1>{loaderData.community.name}</h1>
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

  return (
    <div>
      {t("errors.unexpectedWithMessage", { message: error.statusText })}
    </div>
  );
}
