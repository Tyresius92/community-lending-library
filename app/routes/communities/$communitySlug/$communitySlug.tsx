import { useTranslation } from "react-i18next";
import { data, redirect, Form } from "react-router";

import { Button } from "~/components/button/button";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { Prisma } from "~/generated/prisma/client";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { communityJoinSchema } from "~/schemas/community.server";
import { getUserId, loginRedirect } from "~/session.server";
import { suggestDisplayNameFromEmail, useUser } from "~/utils";

import type { Route } from "./+types/$communitySlug";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.community.name },
];

export const loader = async ({ params, request, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

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

export const action = async ({
  params,
  request,
  context,
  url,
}: Route.ActionArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const t = getInstance(context).getFixedT(getLocale(context), "communities");

  const formData = await request.formData();

  const result = communityJoinSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return data(
      { errors: { displayName: t("errors.displayNameRequired") } },
      { status: 400 },
    );
  }

  const { displayName } = result.data;

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
  });
  if (community?.visibility !== "public" || community.joinPolicy !== "open") {
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
        displayName,
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
  const { t } = useTranslation("communities");
  const user = useUser();

  if (loaderData.accessLevel === "limited") {
    return (
      <div>
        <p>{t("notices.inviteOnly")}</p>
      </div>
    );
  }

  const { community, viewerMembership, canJoin } = loaderData;

  return (
    <div>
      {community.description ? <p>{community.description}</p> : null}

      {viewerMembership ? (
        <p>
          {t("notices.memberAs", {
            displayName: viewerMembership.displayName,
          })}
        </p>
      ) : null}
      {!viewerMembership && canJoin ? (
        <Form method="post">
          <TextInput
            label={t("labels.displayName")}
            name="displayName"
            type="text"
            defaultValue={suggestDisplayNameFromEmail(user.email)}
            errorMessage={actionData?.errors.displayName}
          />
          <Button type="submit">{t("buttons.joinCommunity")}</Button>
        </Form>
      ) : null}

      <h2>{t("headings.members")}</h2>
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
