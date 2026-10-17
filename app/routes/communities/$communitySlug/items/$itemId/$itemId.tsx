import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, redirect } from "react-router";

import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { Modal } from "~/components/modal/modal";
import { prisma } from "~/db.server";
import type { LoanStatus } from "~/generated/prisma/client";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";
import { expireIfNeeded } from "~/utils/loan_expiry.server";

import type { Route } from "./+types/$itemId";

type LiveLoanStatus = Extract<LoanStatus, "pending" | "accepted" | "active">;
const LIVE_LOAN_STATUSES: LiveLoanStatus[] = ["pending", "accepted", "active"];

async function getViewerLoanStatus(
  itemId: string,
  borrowerId: string,
): Promise<LiveLoanStatus | null> {
  const loan = await prisma.loan.findFirst({
    where: { itemId, borrowerId, status: { in: LIVE_LOAN_STATUSES } },
    select: { id: true, status: true, expiresAt: true },
  });
  if (!loan) {
    return null;
  }

  const { status } = await expireIfNeeded(loan);

  switch (status) {
    case "pending":
    case "accepted":
    case "active":
      return status;
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
      name: true,
      description: true,
      ownerMembershipId: true,
      ownerMembership: { select: { displayName: true } },
    },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  const isOwnItem = item.ownerMembershipId === found.membership.id;

  if (isOwnItem) {
    return {
      item: { id: item.id, name: item.name, description: item.description },
      isOwnItem,
      ownerDisplayName: null,
      loanStatus: null,
      canRequest: false,
    };
  }

  const loanStatus = await getViewerLoanStatus(item.id, userId);
  const isRevealed = loanStatus === "accepted" || loanStatus === "active";
  const ownerDisplayName = isRevealed ? item.ownerMembership.displayName : null;
  const canRequest = loanStatus === null;

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

  const formData = await request.formData();
  const intent = formData.get("intent");

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

  const isOwnItem = item.ownerMembershipId === found.membership.id;

  switch (intent) {
    case "askToBorrow": {
      if (isOwnItem) {
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
    }
    case "delete": {
      if (!isOwnItem) {
        return new Response(null, { status: 403 });
      }

      await prisma.item.delete({ where: { id: item.id } });

      return redirect(`/communities/${params.communitySlug}/items`);
    }
    default:
      throw new Response("Bad Request", { status: 400 });
  }
};

export default function ItemDetail({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("items");
  const { item, isOwnItem, ownerDisplayName, loanStatus, canRequest } =
    loaderData;
  const { communitySlug } = params;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
      {isOwnItem ? (
        <>
          <Link to={`/communities/${communitySlug}/items/${item.id}/edit`}>
            {t("buttons.edit")}
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              setIsDeleteModalOpen(true);
            }}
          >
            {t("buttons.delete")}
          </Button>
          <Modal
            isOpen={isDeleteModalOpen}
            setIsOpen={setIsDeleteModalOpen}
            title={t("notices.confirmDeleteTitle")}
            closeLabel={t("buttons.close")}
            content={
              <>
                <p>{t("notices.confirmDeleteBody")}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                  }}
                >
                  {t("buttons.cancel")}
                </Button>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <Button type="submit" variant="danger">
                    {t("buttons.confirmDelete")}
                  </Button>
                </Form>
              </>
            }
          />
        </>
      ) : (
        <>
          {canRequest ? (
            <Form method="post">
              <input type="hidden" name="intent" value="askToBorrow" />
              <Button type="submit">{t("buttons.askToBorrow")}</Button>
            </Form>
          ) : null}
          {!canRequest && loanStatus !== null ? (
            <p>
              {loanStatus === "pending" && t("notices.requestPending")}
              {loanStatus === "accepted" && t("notices.requestAccepted")}
              {loanStatus === "active" && t("notices.currentlyBorrowing")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
