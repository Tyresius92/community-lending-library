import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { data, redirect, Form } from "react-router";

import { Button } from "~/components/button/button";
import { TextArea } from "~/components/text_area/text_area";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import {
  isItemErrorCode,
  itemCreateSchema,
  type ItemErrorCode,
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "~/schemas/item";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/new";

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

  const t = getInstance(context).getFixedT(getLocale(context), "items");
  return { title: t("meta.newItem") };
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

  const t = getInstance(context).getFixedT(getLocale(context), "items");
  const formData = await request.formData();

  const result = itemCreateSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    const messages: Record<ItemErrorCode, string> = {
      NAME_REQUIRED: t("errors.nameRequired"),
      NAME_TOO_LONG: t("errors.nameTooLong"),
      DESCRIPTION_TOO_LONG: t("errors.descriptionTooLong"),
    };

    const fieldMessage = (field: string): string | undefined => {
      const issue = result.error.issues.find(
        (issue) => issue.path[0] === field,
      );
      return issue && isItemErrorCode(issue.message)
        ? messages[issue.message]
        : undefined;
    };

    return data(
      {
        errors: {
          name: fieldMessage("name"),
          description: fieldMessage("description"),
        },
      },
      { status: 400 },
    );
  }

  const { name, description } = result.data;

  const item = await prisma.item.create({
    data: {
      name,
      description: description.length > 0 ? description : null,
      community: { connect: { id: found.community.id } },
      ownerMembership: { connect: { id: found.membership.id } },
    },
  });

  return redirect(`/communities/${params.communitySlug}/my_items/${item.id}`);
};

export default function NewItem({ actionData }: Route.ComponentProps) {
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

  return (
    <div>
      <h1>{t("headings.newItem")}</h1>
      <Form method="post">
        <TextInput
          ref={nameRef}
          label={t("labels.name")}
          name="name"
          type="text"
          maxLength={NAME_MAX_LENGTH}
          errorMessage={actionData?.errors.name}
        />
        <TextArea
          ref={descriptionRef}
          label={t("labels.description")}
          name="description"
          rows={4}
          maxLength={DESCRIPTION_MAX_LENGTH}
          errorMessage={actionData?.errors.description}
        />
        <Button type="submit">{t("buttons.createItem")}</Button>
      </Form>
    </div>
  );
}
