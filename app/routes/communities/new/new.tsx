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
import {
  communityCreateSchema,
  isCommunityErrorCode,
  type CommunityErrorCode,
} from "~/schemas/community";
import { getUserId, loginRedirect } from "~/session.server";
import { SLUG_PATTERN, suggestDisplayNameFromEmail, useUser } from "~/utils";

import type { Route } from "./+types/new";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
];

export const loader = async ({ request, context, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const t = getInstance(context).getFixedT(getLocale(context), "communities");
  return { title: t("meta.startACommunity") };
};

export const action = async ({ request, context, url }: Route.ActionArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const t = getInstance(context).getFixedT(getLocale(context), "communities");
  const formData = await request.formData();

  const result = communityCreateSchema.safeParse(Object.fromEntries(formData));

  const messages: Record<CommunityErrorCode, string> = {
    NAME_REQUIRED: t("errors.nameRequired"),
    SLUG_PATTERN: t("errors.slugPattern"),
    VISIBILITY_INVALID: t("errors.visibilityInvalid"),
    JOIN_POLICY_INVALID: t("errors.joinPolicyInvalid"),
    DISPLAY_NAME_REQUIRED: t("errors.displayNameRequired"),
    SLUG_TAKEN: t("errors.slugTaken"),
  };

  if (!result.success) {
    const fieldMessage = (field: string): string | undefined => {
      const issue = result.error.issues.find(
        (issue) => issue.path[0] === field,
      );
      return issue && isCommunityErrorCode(issue.message)
        ? messages[issue.message]
        : undefined;
    };

    return data(
      {
        errors: {
          name: fieldMessage("name"),
          slug: fieldMessage("slug"),
          visibility: fieldMessage("visibility"),
          joinPolicy: fieldMessage("joinPolicy"),
          displayName: fieldMessage("displayName"),
        },
      },
      { status: 400 },
    );
  }

  const { name, slug, description, visibility, joinPolicy, displayName } =
    result.data;

  const slugTakenErrors = {
    errors: {
      name: undefined,
      slug: messages.SLUG_TAKEN,
      visibility: undefined,
      joinPolicy: undefined,
      displayName: undefined,
    },
  };

  if (slug === "new") {
    return data(slugTakenErrors, { status: 400 });
  }

  const existing = await prisma.community.findUnique({ where: { slug } });
  if (existing) {
    return data(slugTakenErrors, { status: 400 });
  }

  try {
    const community = await prisma.community.create({
      data: {
        name,
        slug,
        description: description.length > 0 ? description : null,
        visibility,
        joinPolicy,
        owner: { connect: { id: userId } },
        memberships: {
          create: [
            {
              user: { connect: { id: userId } },
              role: "owner",
              displayName,
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
      return data(slugTakenErrors, { status: 400 });
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
    if (actionData?.errors.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors.slug) {
      slugRef.current?.focus();
    } else if (actionData?.errors.displayName) {
      displayNameRef.current?.focus();
    }
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
          errorMessage={actionData?.errors.name}
        />
        <TextInput
          ref={slugRef}
          label={t("labels.url")}
          name="slug"
          type="text"
          pattern={SLUG_PATTERN.source}
          hintText={t("hints.url")}
          errorMessage={actionData?.errors.slug}
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
          errorMessage={actionData?.errors.visibility}
        />
        <RadioGroup
          label={t("labels.joinPolicy")}
          name="joinPolicy"
          options={[
            { value: "open", label: t("options.joinPolicyOpen") },
            { value: "invite_only", label: t("options.joinPolicyInviteOnly") },
          ]}
          defaultValue="open"
          errorMessage={actionData?.errors.joinPolicy}
        />
        <TextInput
          ref={displayNameRef}
          label={t("labels.yourDisplayName")}
          name="displayName"
          type="text"
          defaultValue={suggestDisplayNameFromEmail(user.email)}
          errorMessage={actionData?.errors.displayName}
        />
        <Button type="submit">{t("buttons.createCommunity")}</Button>
      </Form>
    </main>
  );
}
