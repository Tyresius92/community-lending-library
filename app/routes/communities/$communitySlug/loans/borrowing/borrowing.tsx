import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";

import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { Modal } from "~/components/modal/modal";
import { Table } from "~/components/table/table";
import { prisma } from "~/db.server";
import type { LoanStatus } from "~/generated/prisma/client";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";
import { expireIfNeeded } from "~/utils/loan_expiry.server";

import type { Route } from "./+types/borrowing";

const REVEALED_STATUSES: LoanStatus[] = ["accepted", "active"];
const CANCELLABLE_STATUSES: LoanStatus[] = ["pending", "accepted"];
const CHECKOUT_STATUSES: LoanStatus[] = ["accepted"];

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

  const t = getInstance(context).getFixedT(getLocale(context), "loans");

  const rawLoans = await prisma.loan.findMany({
    where: {
      communityId: found.community.id,
      borrowerId: userId,
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      item: { select: { id: true, name: true } },
      owner: {
        select: {
          memberships: {
            where: { communityId: found.community.id },
            select: { displayName: true },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const loans = await Promise.all(
    rawLoans.map(async (loan) => {
      const { status } = await expireIfNeeded(loan);
      const isRevealed = REVEALED_STATUSES.includes(status);
      return {
        id: loan.id,
        status,
        item: loan.item,
        ownerDisplayName: isRevealed
          ? (loan.owner.memberships[0]?.displayName ?? null)
          : null,
      };
    }),
  );

  return { title: t("meta.borrowing"), loans };
};

export default function Borrowing({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("loans");
  const { loans } = loaderData;
  const { communitySlug } = params;
  const [cancelLoanId, setCancelLoanId] = useState<string | null>(null);

  return (
    <div>
      <h1>{t("headings.borrowing")}</h1>
      {loans.length === 0 ? (
        <p>{t("notices.noBorrowing")}</p>
      ) : (
        <Table caption={t("headings.borrowing")}>
          <Table.Head>
            <Table.ColumnHeader>{t("labels.item")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.owner")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.status")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.actions")}</Table.ColumnHeader>
          </Table.Head>
          <Table.Body>
            {loans.map((loan) => (
              <Table.Row key={loan.id}>
                <Table.RowHeader>
                  <Link
                    to={`/communities/${communitySlug}/items/${loan.item.id}`}
                  >
                    {loan.item.name}
                  </Link>
                </Table.RowHeader>
                <Table.Cell>
                  {loan.ownerDisplayName ?? t("labels.ownerPlaceholder")}
                </Table.Cell>
                <Table.Cell>{t(`status.${loan.status}`)}</Table.Cell>
                <Table.Cell>
                  {CHECKOUT_STATUSES.includes(loan.status) ? (
                    <Form
                      method="post"
                      action={`/communities/${communitySlug}/loans/borrowing/${loan.id}/checkout`}
                    >
                      <Button type="submit" variant="primary">
                        {t("buttons.checkout")}
                      </Button>
                    </Form>
                  ) : null}
                  {CANCELLABLE_STATUSES.includes(loan.status) ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCancelLoanId(loan.id);
                      }}
                    >
                      {t("buttons.cancel")}
                    </Button>
                  ) : null}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      <Modal
        isOpen={cancelLoanId !== null}
        setIsOpen={(isOpen) => {
          if (!isOpen) {
            setCancelLoanId(null);
          }
        }}
        title={t("notices.confirmCancelTitle")}
        closeLabel={t("buttons.close")}
        content={
          <>
            <p>{t("notices.confirmCancelBody")}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setCancelLoanId(null);
              }}
            >
              {t("buttons.cancel")}
            </Button>
            <Form
              method="post"
              action={`/communities/${communitySlug}/loans/borrowing/${cancelLoanId}/cancel`}
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
