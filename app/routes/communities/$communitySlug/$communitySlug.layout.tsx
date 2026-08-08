import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
import invariant from "tiny-invariant";

import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";

import type { Route } from "./+types/$communitySlug.layout";

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const userId = await requireUserId(request);
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
  const error = useRouteError();

  if (error instanceof Error) {
    return <div>An unexpected error occurred: {error.message}</div>;
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>Unknown Error</h1>;
  }

  if (error.status === 404) {
    return <div>Community not found</div>;
  }

  return <div>An unexpected error occurred: {error.statusText}</div>;
}
