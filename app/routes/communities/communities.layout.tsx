import { Outlet } from "react-router";

import { Link } from "~/components/link/link";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";

import type { Route } from "./+types/communities.layout";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const userId = await requireUserId(request);

  const memberships = await prisma.communityMembership.findMany({
    where: { userId },
    select: { community: { select: { id: true, name: true, slug: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return { communities: memberships.map((m) => m.community) };
};

export default function CommunitiesLayout({
  loaderData,
}: Route.ComponentProps) {
  const { communities } = loaderData;

  return (
    <div>
      <nav aria-label="Your communities">
        <ul>
          {communities.map((community) => (
            <li key={community.id}>
              <Link to={`/communities/${community.slug}`}>
                {community.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
