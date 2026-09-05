import { useTranslation } from "react-i18next";
import { data, redirect, Form, useSearchParams } from "react-router";

import { Button } from "~/components/button/button";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { Prisma } from "~/generated/prisma/client";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { validateInviteToken } from "~/models/invite_token.server";
import { communityJoinSchema } from "~/schemas/community";
import { getUserId, loginRedirect } from "~/session.server";
import { suggestDisplayNameFromEmail, useUser } from "~/utils";

import type { Route } from "./+types/join";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
];

export const loader = async ({ request, context, url }: Route.LoaderArgs) => {
  const t = getInstance(context).getFixedT(getLocale(context), "join");
  const errorMessages: Record<"invalid" | "expired" | "revoked", string> = {
    invalid: t("errors.invalid"),
    expired: t("errors.expired"),
    revoked: t("errors.revoked"),
  };

  const token = url.searchParams.get("token");
  const result = token
    ? await validateInviteToken(token)
    : ({ status: "invalid" as const } as const);

  if (result.status !== "ok") {
    return data({
      status: "error" as const,
      title: t("meta.title"),
      errorMessage: errorMessages[result.status],
    });
  }

  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const membership = await prisma.communityMembership.findUnique({
    where: {
      userId_communityId: { userId, communityId: result.community.id },
    },
  });

  if (membership) {
    if (membership.removedAt) {
      throw new Response("Not Found", { status: 404 });
    }
    return redirect(`/communities/${result.community.slug}`);
  }

  return data({
    status: "confirm" as const,
    title: t("meta.title"),
    communityName: result.community.name,
  });
};

export const action = async ({ request, context, url }: Route.ActionArgs) => {
  const token = url.searchParams.get("token");
  const result = token
    ? await validateInviteToken(token)
    : ({ status: "invalid" as const } as const);

  if (result.status !== "ok") {
    return redirect(url.pathname + url.search);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const existingMembership = await prisma.communityMembership.findUnique({
    where: {
      userId_communityId: { userId, communityId: result.community.id },
    },
  });
  if (existingMembership) {
    if (existingMembership.removedAt) {
      throw new Response("Not Found", { status: 404 });
    }
    return redirect(`/communities/${result.community.slug}`);
  }

  const t = getInstance(context).getFixedT(getLocale(context), "join");
  const formData = await request.formData();

  const parsed = communityJoinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return data(
      { errors: { displayName: t("errors.displayNameRequired") } },
      { status: 400 },
    );
  }

  const { displayName } = parsed.data;

  try {
    await prisma.communityMembership.create({
      data: {
        userId,
        communityId: result.community.id,
        role: "member",
        displayName,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return redirect(`/communities/${result.community.slug}`);
    }
    throw error;
  }

  return redirect(`/communities/${result.community.slug}`);
};

export default function Join({ loaderData, actionData }: Route.ComponentProps) {
  const { t } = useTranslation("join");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const user = useUser();

  if (loaderData.status === "error") {
    return (
      <div>
        <p>{loaderData.errorMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("headings.join", { communityName: loaderData.communityName })}</h1>
      <Form method="post">
        <input type="hidden" name="token" value={token} />
        <TextInput
          label={t("labels.displayName")}
          name="displayName"
          type="text"
          defaultValue={suggestDisplayNameFromEmail(user.email)}
          errorMessage={actionData?.errors.displayName}
        />
        <Button type="submit">{t("buttons.join")}</Button>
      </Form>
    </div>
  );
}
