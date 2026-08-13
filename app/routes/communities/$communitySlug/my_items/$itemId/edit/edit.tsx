import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { data, redirect, Form } from "react-router";

import { Button } from "~/components/button/button";
import { TextArea } from "~/components/text_area/text_area";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/edit";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
];

export const loader = async ({
  params,
  request,
  context,
  url,
}: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  const item = await prisma.item.findFirst({
    where: {
      id: params.itemId,
      communityId: found.community.id,
      ownerMembershipId: found.membership.id,
    },
    select: { id: true, name: true, description: true },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  const t = getInstance(context).getFixedT(getLocale(context), "items");
  return { title: t("headings.editItem"), item };
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

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  const item = await prisma.item.findFirst({
    where: {
      id: params.itemId,
      communityId: found.community.id,
      ownerMembershipId: found.membership.id,
    },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  const t = getInstance(context).getFixedT(getLocale(context), "items");
  const formData = await request.formData();

  const name = formData.get("name");
  const description = formData.get("description");

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedDescriptionValue =
    typeof description === "string" ? description.trim() : "";

  let nameError: string | null = null;
  if (trimmedName.length === 0) {
    nameError = t("errors.nameRequired");
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    nameError = t("errors.nameTooLong");
  }

  const errors = {
    name: nameError,
    description:
      trimmedDescriptionValue.length > DESCRIPTION_MAX_LENGTH
        ? t("errors.descriptionTooLong")
        : null,
  };

  if (errors.name || errors.description) {
    return data({ errors }, { status: 400 });
  }

  await prisma.item.update({
    where: { id: item.id },
    data: {
      name: trimmedName,
      description:
        trimmedDescriptionValue.length > 0 ? trimmedDescriptionValue : null,
    },
  });

  return redirect(`/communities/${params.communitySlug}/my_items/${item.id}`);
};

export default function EditItem({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (actionData?.errors.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors.description) {
      descriptionRef.current?.focus();
    }
  }, [actionData]);

  const { t } = useTranslation("items");
  const { item } = loaderData;

  return (
    <div>
      <h1>{t("headings.editItem")}</h1>
      <Form method="post">
        <TextInput
          ref={nameRef}
          label={t("labels.name")}
          name="name"
          type="text"
          maxLength={NAME_MAX_LENGTH}
          defaultValue={item.name}
          errorMessage={actionData?.errors.name ?? undefined}
        />
        <TextArea
          ref={descriptionRef}
          label={t("labels.description")}
          name="description"
          rows={4}
          maxLength={DESCRIPTION_MAX_LENGTH}
          defaultValue={item.description ?? undefined}
          errorMessage={actionData?.errors.description ?? undefined}
        />
        <Button type="submit">{t("buttons.saveChanges")}</Button>
      </Form>
    </div>
  );
}
