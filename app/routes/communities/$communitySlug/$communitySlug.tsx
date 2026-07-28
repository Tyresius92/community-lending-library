import { data, redirect, Form } from "react-router";
import invariant from "tiny-invariant";

import { Button } from "~/components/button/button";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { Prisma } from "~/generated/prisma/client";
import { requireUserId } from "~/session.server";
import { suggestDisplayNameFromEmail, useUser } from "~/utils";

import type { Route } from "./+types/$communitySlug";

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const userId = await requireUserId(request);
  invariant(params.communitySlug, "communitySlug not found");

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
    include: {
      memberships: {
        select: {
          id: true,
          userId: true,
          displayName: true,
          role: true,
          joinedAt: true,
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!community) {
    throw new Response("Not Found", { status: 404 });
  }

  const viewerMembership =
    community.memberships.find((m) => m.userId === userId) ?? null;

  if (community.visibility === "private" && !viewerMembership) {
    throw new Response("Not Found", { status: 404 });
  }

  if (
    community.visibility === "public" &&
    community.joinPolicy === "invite_only" &&
    !viewerMembership
  ) {
    return {
      accessLevel: "limited" as const,
      community: { name: community.name },
    };
  }

  const canJoin =
    !viewerMembership &&
    community.visibility === "public" &&
    community.joinPolicy === "open";

  return {
    accessLevel: "full" as const,
    community,
    viewerMembership,
    canJoin,
  };
};

export const action = async ({ params, request }: Route.ActionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.communitySlug, "communitySlug not found");

  const formData = await request.formData();
  const displayName = formData.get("displayName");

  if (typeof displayName !== "string" || displayName.trim().length === 0) {
    return data(
      { errors: { displayName: "Display name is required" } },
      { status: 400 },
    );
  }

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
  });
  if (
    !community ||
    community.visibility !== "public" ||
    community.joinPolicy !== "open"
  ) {
    throw new Response("Not Found", { status: 404 });
  }

  const existingMembership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  if (existingMembership) {
    return redirect(`/communities/${community.slug}`);
  }

  try {
    await prisma.communityMembership.create({
      data: {
        userId,
        communityId: community.id,
        role: "member",
        displayName: displayName.trim(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return redirect(`/communities/${community.slug}`);
    }
    throw error;
  }

  return redirect(`/communities/${community.slug}`);
};

export default function CommunityOverview({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const user = useUser();

  if (loaderData.accessLevel === "limited") {
    return (
      <div>
        <p>This community requires an invite to join.</p>
      </div>
    );
  }

  const { community, viewerMembership, canJoin } = loaderData;

  return (
    <div>
      {community.description ? <p>{community.description}</p> : null}

      {viewerMembership ? (
        <p>You&apos;re a member as {viewerMembership.displayName}.</p>
      ) : null}
      {!viewerMembership && canJoin ? (
        <Form method="post">
          <TextInput
            label="Display name"
            name="displayName"
            type="text"
            defaultValue={suggestDisplayNameFromEmail(user.email)}
            errorMessage={actionData?.errors?.displayName ?? undefined}
          />
          <Button type="submit">Join community</Button>
        </Form>
      ) : null}

      <h2>Members</h2>
      <ul>
        {community.memberships.map((membership) => (
          <li key={membership.id}>
            {membership.displayName} ({membership.role})
          </li>
        ))}
      </ul>
    </div>
  );
}
