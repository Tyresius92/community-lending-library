import { useEffect, useRef } from "react";
import { data, redirect, Form } from "react-router";

import { Button } from "~/components/button/button";
import { RadioGroup } from "~/components/radio_group/radio_group";
import { TextArea } from "~/components/text_area/text_area";
import { TextInput } from "~/components/text_input/text_input";
import { prisma } from "~/db.server";
import { Prisma } from "~/generated/prisma/client";
import { requireUserId } from "~/session.server";
import {
  SLUG_PATTERN,
  suggestDisplayNameFromEmail,
  useUser,
  validateSlug,
} from "~/utils";

import type { Route } from "./+types/new";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireUserId(request);
  return null;
};

export const action = async ({ request }: Route.ActionArgs) => {
  const userId = await requireUserId(request);
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
        ? "Name is required"
        : null,
    slug: validateSlug(slug)
      ? null
      : "Slug must be lowercase letters, numbers, and hyphens (3–50 characters)",
    displayName:
      typeof displayName !== "string" || displayName.trim().length === 0
        ? "Display name is required"
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

  if (trimmedSlug === "new") {
    return data(
      {
        errors: {
          name: null,
          slug: "That URL is already taken. Try another.",
          displayName: null,
        },
      },
      { status: 400 },
    );
  }

  const existing = await prisma.community.findUnique({
    where: { slug: trimmedSlug },
  });
  if (existing) {
    return data(
      {
        errors: {
          name: null,
          slug: "That URL is already taken. Try another.",
          displayName: null,
        },
      },
      { status: 400 },
    );
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
      return data(
        {
          errors: {
            name: null,
            slug: "That URL is already taken. Try another.",
            displayName: null,
          },
        },
        { status: 400 },
      );
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

  return (
    <main>
      <h1>Start a community</h1>
      <Form method="post">
        <TextInput
          ref={nameRef}
          label="Name"
          name="name"
          type="text"
          errorMessage={actionData?.errors?.name ?? undefined}
        />
        <TextInput
          ref={slugRef}
          label="URL"
          name="slug"
          type="text"
          pattern={SLUG_PATTERN.source}
          hintText="Lowercase letters, numbers, and hyphens only."
          errorMessage={actionData?.errors?.slug ?? undefined}
        />
        <TextArea label="Description (optional)" name="description" rows={4} />
        <RadioGroup
          label="Visibility"
          name="visibility"
          options={[
            { value: "public", label: "Public" },
            { value: "private", label: "Private" },
          ]}
          defaultValue="public"
        />
        <RadioGroup
          label="Who can join"
          name="joinPolicy"
          options={[
            { value: "open", label: "Anyone can join" },
            { value: "invite_only", label: "Invite only" },
          ]}
          defaultValue="open"
        />
        <TextInput
          ref={displayNameRef}
          label="Your display name in this community"
          name="displayName"
          type="text"
          defaultValue={suggestDisplayNameFromEmail(user.email)}
          errorMessage={actionData?.errors?.displayName ?? undefined}
        />
        <Button type="submit">Create community</Button>
      </Form>
    </main>
  );
}
