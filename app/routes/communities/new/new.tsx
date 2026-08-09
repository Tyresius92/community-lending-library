import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { data, redirect, Form } from "react-router";

import { Button } from "~/components/button/button";
import { RadioGroup } from "~/components/radio_group/radio_group";
import { TextArea } from "~/components/text_area/text_area";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { Prisma } from "~/generated/prisma/client";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";
import {
  SLUG_PATTERN,
  suggestDisplayNameFromEmail,
  useUser,
  validateSlug,
} from "~/utils";

import type { Route } from "./+types/new";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.title },
];

export const loader = async ({ request, context, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) return loginRedirect(url);

  const t = getInstance(context).getFixedT(getLocale(context), "communities");
  return { title: t("meta.startACommunity") };
};

export const action = async ({ request, context, url }: Route.ActionArgs) => {
  const userId = await getUserId(request);
  if (!userId) return loginRedirect(url);

  const t = getInstance(context).getFixedT(getLocale(context), "communities");
  const formData = await request.formData();

  const name = formData.get("name");
  const slug = formData.get("slug");
  const description = formData.get("description");
  const visibility =
    formData.get("visibility") === "private" ? "private" : "public";
  const joinPolicy =
    formData.get("joinPolicy") === "invite_only" ? "invite_only" : "open";
  const displayName = formData.get("displayName");

  const errors = {
    name:
      typeof name !== "string" || name.trim().length === 0
        ? t("errors.nameRequired")
        : null,
    slug: validateSlug(slug) ? null : t("errors.slugPattern"),
    displayName:
      typeof displayName !== "string" || displayName.trim().length === 0
        ? t("errors.displayNameRequired")
        : null,
  };

  if (errors.name || errors.slug || errors.displayName) {
    return data({ errors }, { status: 400 });
  }

  const trimmedName = (name as string).trim();
  const trimmedSlug = slug as string;
  const trimmedDescription =
    typeof description === "string" && description.trim().length > 0
      ? description.trim()
      : null;
  const trimmedDisplayName = (displayName as string).trim();

  const slugTakenError = {
    errors: { name: null, slug: t("errors.slugTaken"), displayName: null },
  };

  if (trimmedSlug === "new") {
    return data(slugTakenError, { status: 400 });
  }

  const existing = await prisma.community.findUnique({
    where: { slug: trimmedSlug },
  });
  if (existing) {
    return data(slugTakenError, { status: 400 });
  }

  try {
    const community = await prisma.community.create({
      data: {
        name: trimmedName,
        slug: trimmedSlug,
        description: trimmedDescription,
        visibility,
        joinPolicy,
        owner: { connect: { id: userId } },
        memberships: {
          create: [
            {
              user: { connect: { id: userId } },
              role: "owner",
              displayName: trimmedDisplayName,
            },
          ],
        },
      },
    });

    return redirect(`/communities/${community.slug}`);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return data(slugTakenError, { status: 400 });
    }
    throw error;
  }
};

export default function NewCommunityPage({ actionData }: Route.ComponentProps) {
  const user = useUser();
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.name) nameRef.current?.focus();
    else if (actionData?.errors?.slug) slugRef.current?.focus();
    else if (actionData?.errors?.displayName) displayNameRef.current?.focus();
  }, [actionData]);

  const { t } = useTranslation("communities");

  return (
    <main>
      <h1>{t("headings.startACommunity")}</h1>
      <Form method="post">
        <TextInput
          ref={nameRef}
          label={t("labels.name")}
          name="name"
          type="text"
          errorMessage={actionData?.errors?.name ?? undefined}
        />
        <TextInput
          ref={slugRef}
          label={t("labels.url")}
          name="slug"
          type="text"
          pattern={SLUG_PATTERN.source}
          hintText={t("hints.url")}
          errorMessage={actionData?.errors?.slug ?? undefined}
        />
        <TextArea label={t("labels.description")} name="description" rows={4} />
        <RadioGroup
          label={t("labels.visibility")}
          name="visibility"
          options={[
            { value: "public", label: t("options.visibilityPublic") },
            { value: "private", label: t("options.visibilityPrivate") },
          ]}
          defaultValue="public"
        />
        <RadioGroup
          label={t("labels.joinPolicy")}
          name="joinPolicy"
          options={[
            { value: "open", label: t("options.joinPolicyOpen") },
            { value: "invite_only", label: t("options.joinPolicyInviteOnly") },
          ]}
          defaultValue="open"
        />
        <TextInput
          ref={displayNameRef}
          label={t("labels.yourDisplayName")}
          name="displayName"
          type="text"
          defaultValue={suggestDisplayNameFromEmail(user.email)}
          errorMessage={actionData?.errors?.displayName ?? undefined}
        />
        <Button type="submit">{t("buttons.createCommunity")}</Button>
      </Form>
    </main>
  );
}
