import { useState } from "react";
import { useTranslation } from "react-i18next";
import { data, redirect, Form } from "react-router";

import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { Modal } from "~/components/modal/modal";
import { RadioGroup } from "~/components/radio_group/radio_group";
import { Table } from "~/components/table/table";
import { prisma } from "~/db.server";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import {
  computeExpiresAt,
  inviteTokenGenerateSchema,
} from "~/schemas/invite_token";
import { getUserId, loginRedirect } from "~/session.server";
import {
  getCommunityMembership,
  meetsMinRole,
} from "~/utils/community_role.server";
import { generateInviteToken } from "~/utils/invite_token.server";

import type { Route } from "./+types/invite";

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

  if (!meetsMinRole(found.membership.role, "admin")) {
    throw new Response("Forbidden", { status: 403 });
  }

  const t = getInstance(context).getFixedT(getLocale(context), "invite");
  const dateFormatter = new Intl.DateTimeFormat(getLocale(context), {
    dateStyle: "medium",
  });

  const now = new Date();
  const inviteTokens = await prisma.inviteToken.findMany({
    where: {
      communityId: found.community.id,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      token: true,
      createdAt: true,
      expiresAt: true,
      createdByUserId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const creatorMemberships = await prisma.communityMembership.findMany({
    where: {
      communityId: found.community.id,
      userId: {
        in: [...new Set(inviteTokens.map((token) => token.createdByUserId))],
      },
    },
    select: { userId: true, displayName: true },
  });
  const creatorNameByUserId = new Map(
    creatorMemberships.map((membership) => [
      membership.userId,
      membership.displayName,
    ]),
  );

  const links = inviteTokens.map((inviteToken) => ({
    id: inviteToken.id,
    url: new URL(`/join?token=${inviteToken.token}`, url).toString(),
    createdAt: dateFormatter.format(inviteToken.createdAt),
    expiresAt: inviteToken.expiresAt
      ? dateFormatter.format(inviteToken.expiresAt)
      : null,
    createdBy: creatorNameByUserId.get(inviteToken.createdByUserId) ?? "",
  }));

  return { title: t("meta.invite"), links };
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

  if (!meetsMinRole(found.membership.role, "admin")) {
    throw new Response("Forbidden", { status: 403 });
  }

  const t = getInstance(context).getFixedT(getLocale(context), "invite");
  const formData = await request.formData();

  const result = inviteTokenGenerateSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!result.success) {
    return data({ error: t("errors.expiryInvalid") }, { status: 400 });
  }

  await prisma.inviteToken.create({
    data: {
      token: generateInviteToken(),
      community: { connect: { id: found.community.id } },
      createdBy: { connect: { id: userId } },
      expiresAt: computeExpiresAt(result.data.expiryPreset),
    },
  });

  return redirect(`/communities/${params.communitySlug}/invite`);
};

export default function Invite({
  loaderData,
  actionData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("invite");
  const { links } = loaderData;
  const { communitySlug } = params;
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null);

  return (
    <div>
      <h1>{t("headings.invite")}</h1>
      <Form method="post">
        <RadioGroup
          label={t("labels.expiryPreset")}
          name="expiryPreset"
          options={[
            { value: "1", label: t("options.expiry1Day") },
            { value: "7", label: t("options.expiry7Days") },
            { value: "30", label: t("options.expiry30Days") },
            { value: "90", label: t("options.expiry90Days") },
            { value: "", label: t("options.expiryNever") },
          ]}
          defaultValue="7"
          errorMessage={actionData?.error}
        />
        <Button type="submit">{t("buttons.generateLink")}</Button>
      </Form>
      {links.length === 0 ? (
        <p>{t("notices.noActiveLinks")}</p>
      ) : (
        <Table caption={t("headings.invite")}>
          <Table.Head>
            <Table.ColumnHeader>{t("labels.link")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.created")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.expires")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.createdBy")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.actions")}</Table.ColumnHeader>
          </Table.Head>
          <Table.Body>
            {links.map((link) => (
              <Table.Row key={link.id}>
                <Table.RowHeader>
                  <Link href={new URL(link.url)}>{link.url}</Link>
                </Table.RowHeader>
                <Table.Cell>{link.createdAt}</Table.Cell>
                <Table.Cell>
                  {link.expiresAt ?? t("notices.neverExpires")}
                </Table.Cell>
                <Table.Cell>{link.createdBy}</Table.Cell>
                <Table.Cell>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setRevokeTokenId(link.id);
                    }}
                  >
                    {t("buttons.revoke")}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      <Modal
        isOpen={revokeTokenId !== null}
        setIsOpen={(isOpen) => {
          if (!isOpen) {
            setRevokeTokenId(null);
          }
        }}
        title={t("notices.confirmRevokeTitle")}
        closeLabel={t("buttons.close")}
        content={
          <>
            <p>{t("notices.confirmRevokeBody")}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setRevokeTokenId(null);
              }}
            >
              {t("buttons.cancel")}
            </Button>
            <Form
              method="post"
              action={`/communities/${communitySlug}/invite/${revokeTokenId}/revoke`}
            >
              <Button type="submit" variant="danger">
                {t("buttons.confirmRevoke")}
              </Button>
            </Form>
          </>
        }
      />
    </div>
  );
}
