import { useTranslation } from "react-i18next";
import { Form, redirect } from "react-router";

import { Button } from "~/components/button/button";
import { prisma } from "~/db.server";
import type { LoanStatus } from "~/generated/prisma/client";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/$itemId";

type LiveLoanStatus = Extract<LoanStatus, "pending" | "accepted" | "active">;
const LIVE_LOAN_STATUSES: LiveLoanStatus[] = ["pending", "accepted", "active"];

async function getViewerLoanStatus(
  itemId: string,
  borrowerId: string,
): Promise<LiveLoanStatus | null> {
  const loan = await prisma.loan.findFirst({
    where: { itemId, borrowerId, status: { in: LIVE_LOAN_STATUSES } },
    select: { status: true },
  });
  if (!loan) {
    return null;
  }

  switch (loan.status) {
    case "pending":
    case "accepted":
    case "active":
      return loan.status;
    default:
      return null;
  }
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.item.name },
];

export const loader = async ({ params, request, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const community = await prisma.community.findFirst({
    where: { slug: params.communitySlug, archivedAt: null },
    select: { id: true, visibility: true },
  });
  if (!community) {
    throw new Response("Not Found", { status: 404 });
  }

  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  if (!membership && community.visibility === "private") {
    throw new Response("Not Found", { status: 404 });
  }

  const item = await prisma.item.findFirst({
    where: {
      id: params.itemId,
      communityId: community.id,
      ownerMembership: { removedAt: null },
    },
    select: {
      id: true,
      name: true,
      description: true,
      ownerMembershipId: true,
      ownerMembership: { select: { displayName: true } },
    },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  const isOwnItem = membership
    ? item.ownerMembershipId === membership.id
    : false;

  let loanStatus: LiveLoanStatus | null = null;
  let ownerDisplayName: string | null = null;
  let canRequest = false;

  if (!isOwnItem) {
    loanStatus = await getViewerLoanStatus(item.id, userId);
    const isRevealed = loanStatus === "accepted" || loanStatus === "active";
    ownerDisplayName = isRevealed ? item.ownerMembership.displayName : null;
    canRequest =
      Boolean(membership) && !membership?.removedAt && loanStatus === null;
  }

  return {
    item: { id: item.id, name: item.name, description: item.description },
    isOwnItem,
    ownerDisplayName,
    loanStatus,
    canRequest,
  };
};

export const action = async ({ params, request, url }: Route.ActionArgs) => {
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
      ownerMembership: { removedAt: null },
    },
    select: {
      id: true,
      ownerMembershipId: true,
      ownerMembership: { select: { userId: true } },
    },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  if (item.ownerMembershipId === found.membership.id) {
    return new Response(null, { status: 403 });
  }

  const existingStatus = await getViewerLoanStatus(item.id, userId);
  if (existingStatus !== null) {
    return new Response(null, { status: 403 });
  }

  await prisma.loan.create({
    data: {
      item: { connect: { id: item.id } },
      community: { connect: { id: found.community.id } },
      borrower: { connect: { id: userId } },
      owner: { connect: { id: item.ownerMembership.userId } },
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  return redirect(
    `/communities/${params.communitySlug}/items/${params.itemId}`,
  );
};

export default function ItemDetail({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("items");
  const { item, isOwnItem, ownerDisplayName, loanStatus, canRequest } =
    loaderData;

  const ownerLabel = isOwnItem
    ? t("labels.you")
    : (ownerDisplayName ?? t("labels.ownerPlaceholder"));

  return (
    <div>
      <h1>{item.name}</h1>
      {item.description ? <p>{item.description}</p> : null}
      <p>
        {t("labels.owner")}: {ownerLabel}
      </p>
      {!isOwnItem && canRequest ? (
        <Form method="post">
          <Button type="submit">{t("buttons.askToBorrow")}</Button>
        </Form>
      ) : null}
      {!isOwnItem && !canRequest && loanStatus !== null ? (
        <p>
          {loanStatus === "pending" && t("notices.requestPending")}
          {loanStatus === "accepted" && t("notices.requestAccepted")}
          {loanStatus === "active" && t("notices.currentlyBorrowing")}
        </p>
      ) : null}
    </div>
  );
}
