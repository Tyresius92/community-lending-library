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

import type { Route } from "./+types/lending";

const REVEALED_STATUSES: LoanStatus[] = ["pending", "accepted", "active"];
const PENDING_STATUSES: LoanStatus[] = ["pending"];
const CANCELLABLE_STATUSES: LoanStatus[] = ["accepted"];

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
      ownerId: userId,
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      item: { select: { id: true, name: true } },
      borrower: {
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
        borrowerDisplayName: isRevealed
          ? (loan.borrower.memberships[0]?.displayName ?? null)
          : null,
      };
    }),
  );

  return { title: t("meta.lending"), loans };
};

export default function Lending({ loaderData, params }: Route.ComponentProps) {
  const { t } = useTranslation("loans");
  const { loans } = loaderData;
  const { communitySlug } = params;
  const [cancelLoanId, setCancelLoanId] = useState<string | null>(null);

  return (
    <div>
      <h1>{t("headings.lending")}</h1>
      {loans.length === 0 ? (
        <p>{t("notices.noLending")}</p>
      ) : (
        <Table caption={t("headings.lending")}>
          <Table.Head>
            <Table.ColumnHeader>{t("labels.item")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("labels.borrower")}</Table.ColumnHeader>
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
                  {loan.borrowerDisplayName ?? t("labels.borrowerPlaceholder")}
                </Table.Cell>
                <Table.Cell>{t(`status.${loan.status}`)}</Table.Cell>
                <Table.Cell>
                  {PENDING_STATUSES.includes(loan.status) ? (
                    <>
                      <Form
                        method="post"
                        action={`/communities/${communitySlug}/loans/lending/${loan.id}/accept`}
                      >
                        <Button type="submit" variant="primary">
                          {t("buttons.accept")}
                        </Button>
                      </Form>
                      <Form
                        method="post"
                        action={`/communities/${communitySlug}/loans/lending/${loan.id}/decline`}
                      >
                        <Button type="submit" variant="secondary">
                          {t("buttons.decline")}
                        </Button>
                      </Form>
                    </>
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
              action={`/communities/${communitySlug}/loans/lending/${cancelLoanId}/cancel`}
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
