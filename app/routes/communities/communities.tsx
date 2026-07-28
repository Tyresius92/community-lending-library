import { Link } from "~/components/link/link";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";

import type { Route } from "./+types/communities";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const userId = await requireUserId(request);

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
    communities: communities.map((c) => ({
      ...c,
      isMember: memberOf.has(c.id),
    })),
  };
};

export default function CommunitiesDirectory({
  loaderData,
}: Route.ComponentProps) {
  const { communities } = loaderData;

  return (
    <main>
      <h1>Browse communities</h1>
      {communities.length === 0 ? <p>No communities to browse yet.</p> : null}
      <ul>
        {communities.map((community) => (
          <li key={community.id}>
            <h2>
              <Link to={`/communities/${community.slug}`}>
                {community.name}
              </Link>
            </h2>
            {community.description ? <p>{community.description}</p> : null}
            {community.isMember ? <p>Already a member.</p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
