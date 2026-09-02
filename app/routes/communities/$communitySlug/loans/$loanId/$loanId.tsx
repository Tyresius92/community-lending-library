import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";

import { Button } from "~/components/button/button";
import { Modal } from "~/components/modal/modal";
import { prisma } from "~/db.server";
import type { LoanStatus } from "~/generated/prisma/client";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";
import { expireIfNeeded } from "~/utils/loan_expiry.server";

import type { Route } from "./+types/$loanId";

const OWNER_REVEALED_STATUSES: LoanStatus[] = ["pending", "accepted", "active"];
const BORROWER_REVEALED_STATUSES: LoanStatus[] = ["accepted", "active"];

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
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

  const rawLoan = await prisma.loan.findFirst({
    where: { id: params.loanId, communityId: found.community.id },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      checkedOutAt: true,
      borrowerConfirmedReturnAt: true,
      ownerId: true,
      borrowerId: true,
      item: { select: { id: true, name: true } },
      owner: {
        select: {
          memberships: {
            where: { communityId: found.community.id },
            select: { displayName: true },
          },
        },
      },
      borrower: {
        select: {
          memberships: {
            where: { communityId: found.community.id },
            select: { displayName: true },
          },
        },
      },
    },
  });
  if (!rawLoan) {
    throw new Response("Not Found", { status: 404 });
  }

  let viewerRole: "owner" | "borrower" | null = null;
  if (rawLoan.ownerId === userId) {
    viewerRole = "owner";
  } else if (rawLoan.borrowerId === userId) {
    viewerRole = "borrower";
  }
  if (!viewerRole) {
    throw new Response("Not Found", { status: 404 });
  }

  const loan = await expireIfNeeded(rawLoan);

  let otherPartyDisplayName: string | null = null;
  if (
    viewerRole === "borrower" &&
    BORROWER_REVEALED_STATUSES.includes(loan.status)
  ) {
    otherPartyDisplayName = loan.owner.memberships[0]?.displayName ?? null;
  } else if (
    viewerRole === "owner" &&
    OWNER_REVEALED_STATUSES.includes(loan.status)
  ) {
    otherPartyDisplayName = loan.borrower.memberships[0]?.displayName ?? null;
  }

  const actions = {
    canAccept: viewerRole === "owner" && loan.status === "pending",
    canDecline: viewerRole === "owner" && loan.status === "pending",
    canCancel:
      (viewerRole === "borrower" &&
        (loan.status === "pending" ||
          (loan.status === "accepted" && loan.checkedOutAt === null))) ||
      (viewerRole === "owner" &&
        loan.status === "accepted" &&
        loan.checkedOutAt === null),
    canCheckout: loan.status === "accepted",
    canConfirmReturn: viewerRole === "owner" && loan.status === "active",
    canFlagReturn:
      viewerRole === "borrower" &&
      loan.status === "active" &&
      loan.borrowerConfirmedReturnAt === null,
  };

  return {
    title: loan.item.name,
    loan: {
      id: loan.id,
      status: loan.status,
      item: loan.item,
      viewerRole,
      otherPartyDisplayName,
      borrowerConfirmedReturnAt: loan.borrowerConfirmedReturnAt,
    },
    actions,
  };
};

export default function LoanDetail({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("loans");
  const { loan, actions } = loaderData;
  const { communitySlug } = params;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const sidePrefix = loan.viewerRole === "owner" ? "lending" : "borrowing";

  return (
    <div>
      <h1>{loan.item.name}</h1>
      <p>
        {t("labels.status")}: {t(`status.${loan.status}`)}
      </p>
      <p>
        {t(loan.viewerRole === "owner" ? "labels.borrower" : "labels.owner")}:{" "}
        {loan.otherPartyDisplayName ??
          t(
            loan.viewerRole === "owner"
              ? "labels.borrowerPlaceholder"
              : "labels.ownerPlaceholder",
          )}
      </p>

      {actions.canAccept ? (
        <Form
          method="post"
          action={`/communities/${communitySlug}/loans/lending/${loan.id}/accept`}
        >
          <Button type="submit" variant="primary">
            {t("buttons.accept")}
          </Button>
        </Form>
      ) : null}
      {actions.canDecline ? (
        <Form
          method="post"
          action={`/communities/${communitySlug}/loans/lending/${loan.id}/decline`}
        >
          <Button type="submit" variant="secondary">
            {t("buttons.decline")}
          </Button>
        </Form>
      ) : null}
      {actions.canCheckout ? (
        <Form
          method="post"
          action={`/communities/${communitySlug}/loans/${sidePrefix}/${loan.id}/checkout`}
        >
          <Button type="submit" variant="primary">
            {t("buttons.checkout")}
          </Button>
        </Form>
      ) : null}
      {actions.canConfirmReturn ? (
        <>
          <Form
            method="post"
            action={`/communities/${communitySlug}/loans/lending/${loan.id}/confirm_return`}
          >
            <Button type="submit" variant="primary">
              {t("buttons.confirmReturn")}
            </Button>
          </Form>
          {loan.borrowerConfirmedReturnAt !== null ? (
            <p>{t("notices.borrowerReportedReturn")}</p>
          ) : null}
        </>
      ) : null}
      {actions.canFlagReturn ? (
        <Form
          method="post"
          action={`/communities/${communitySlug}/loans/borrowing/${loan.id}/return`}
        >
          <Button type="submit" variant="primary">
            {t("buttons.iReturnedIt")}
          </Button>
        </Form>
      ) : null}
      {!actions.canFlagReturn &&
      loan.viewerRole === "borrower" &&
      loan.status === "active" &&
      loan.borrowerConfirmedReturnAt !== null ? (
        <p>{t("notices.returnReportedByYou")}</p>
      ) : null}
      {actions.canCancel ? (
        <Button
          variant="secondary"
          onClick={() => {
            setIsCancelModalOpen(true);
          }}
        >
          {t("buttons.cancel")}
        </Button>
      ) : null}

      <Modal
        isOpen={isCancelModalOpen}
        setIsOpen={setIsCancelModalOpen}
        title={t("notices.confirmCancelTitle")}
        closeLabel={t("buttons.close")}
        content={
          <>
            <p>{t("notices.confirmCancelBody")}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setIsCancelModalOpen(false);
              }}
            >
              {t("buttons.cancel")}
            </Button>
            <Form
              method="post"
              action={`/communities/${communitySlug}/loans/${sidePrefix}/${loan.id}/cancel`}
            >
              <Button type="submit" variant="danger">
                {t("buttons.confirmCancel")}
              </Button>
            </Form>
          </>
        }
      />
    </div>
  );
}
