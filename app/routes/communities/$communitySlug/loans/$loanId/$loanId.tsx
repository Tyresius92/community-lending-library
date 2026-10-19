import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { data, Form, redirect } from "react-router";

import { Button } from "~/components/button/button";
import { Modal } from "~/components/modal/modal";
import { TextArea } from "~/components/text_area/text_area";
import { prisma } from "~/db.server";
import { emailT } from "~/emails/locale.server";
import { ReturnFlaggedEmail } from "~/emails/return_flagged_email";
import type { LoanStatus } from "~/generated/prisma/client";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { sendEmail } from "~/mailer.server";
import {
  BODY_MAX_LENGTH,
  isMessageErrorCode,
  messageCreateSchema,
  type MessageErrorCode,
} from "~/schemas/message";
import { getUserId, loginRedirect } from "~/session.server";
import { safeRedirect } from "~/utils";
import { getCommunityMembership } from "~/utils/community_role.server";
import { expireIfNeeded } from "~/utils/loan_expiry.server";
import { splitIntoLines } from "~/utils/message_lines.server";

import type { Route } from "./+types/$loanId";

const OWNER_REVEALED_STATUSES: LoanStatus[] = ["pending", "accepted", "active"];
const BORROWER_REVEALED_STATUSES: LoanStatus[] = ["accepted", "active"];
const LIVE_STATUSES: LoanStatus[] = ["pending", "accepted", "active"];

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

  const isThreadOpen = LIVE_STATUSES.includes(loan.status);
  const dateFormatter = new Intl.DateTimeFormat(getLocale(context), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rawMessages = isThreadOpen
    ? await prisma.message.findMany({
        where: { loanId: loan.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, senderId: true, body: true, createdAt: true },
      })
    : [];
  const messages = rawMessages.map((message) => ({
    id: message.id,
    lines: splitIntoLines(message.body),
    isMine: message.senderId === userId,
    sentAt: message.createdAt.toISOString(),
    sentAtLabel: dateFormatter.format(message.createdAt),
  }));

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
    thread: { isOpen: isThreadOpen, messages },
  };
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

  const formData = await request.formData();
  const intent = formData.get("intent");
  const redirectTo = safeRedirect(
    formData.get("redirectTo"),
    `/communities/${params.communitySlug}/loans/${params.loanId}`,
  );

  const rawLoan = await prisma.loan.findFirst({
    where: {
      id: params.loanId,
      communityId: found.community.id,
      OR: [{ ownerId: userId }, { borrowerId: userId }],
    },
    include: {
      item: { select: { name: true } },
      owner: { select: { email: true } },
    },
  });
  if (!rawLoan) {
    throw new Response("Not Found", { status: 404 });
  }

  const viewerRole: "owner" | "borrower" =
    rawLoan.ownerId === userId ? "owner" : "borrower";
  const loan = await expireIfNeeded(rawLoan);

  switch (intent) {
    case "accept": {
      if (viewerRole !== "owner" || loan.status !== "pending") {
        throw new Response("Forbidden", { status: 403 });
      }
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });
      return redirect(redirectTo);
    }
    case "decline": {
      if (viewerRole !== "owner" || loan.status !== "pending") {
        throw new Response("Forbidden", { status: 403 });
      }
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "declined", declinedAt: new Date() },
      });
      return redirect(redirectTo);
    }
    case "cancel": {
      const isCancellable =
        viewerRole === "borrower"
          ? loan.status === "pending" ||
            (loan.status === "accepted" && loan.checkedOutAt === null)
          : loan.status === "accepted" && loan.checkedOutAt === null;
      if (!isCancellable) {
        throw new Response("Forbidden", { status: 403 });
      }
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledByRole: viewerRole,
        },
      });
      return redirect(redirectTo);
    }
    case "checkout": {
      if (loan.status !== "accepted") {
        throw new Response("Forbidden", { status: 403 });
      }
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "active", checkedOutAt: new Date() },
      });
      return redirect(redirectTo);
    }
    case "return": {
      if (
        viewerRole !== "borrower" ||
        loan.status !== "active" ||
        loan.borrowerConfirmedReturnAt !== null
      ) {
        throw new Response("Forbidden", { status: 403 });
      }
      await prisma.loan.update({
        where: { id: loan.id },
        data: { borrowerConfirmedReturnAt: new Date() },
      });
      const loanUrl = new URL(
        `/communities/${params.communitySlug}/loans/${loan.id}`,
        url,
      );
      await sendEmail({
        to: loan.owner.email,
        subject: emailT("returnFlagged.subject", {
          itemName: loan.item.name,
        }),
        react: (
          <ReturnFlaggedEmail
            itemName={loan.item.name}
            loanUrl={loanUrl.toString()}
          />
        ),
      });
      return redirect(redirectTo);
    }
    case "confirm_return": {
      if (viewerRole !== "owner" || loan.status !== "active") {
        throw new Response("Forbidden", { status: 403 });
      }
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "completed", ownerConfirmedReturnAt: new Date() },
      });
      return redirect(redirectTo);
    }
    case "send_message": {
      if (!LIVE_STATUSES.includes(loan.status)) {
        throw new Response("Forbidden", { status: 403 });
      }
      const result = messageCreateSchema.safeParse(
        Object.fromEntries(formData),
      );
      if (!result.success) {
        const t = getInstance(context).getFixedT(getLocale(context), "loans");
        const messages: Record<MessageErrorCode, string> = {
          BODY_REQUIRED: t("errors.bodyRequired"),
          BODY_TOO_LONG: t("errors.bodyTooLong", { max: BODY_MAX_LENGTH }),
        };
        const issue = result.error.issues.find(
          (issue) => issue.path[0] === "body",
        );
        return data(
          {
            errors: {
              body:
                issue && isMessageErrorCode(issue.message)
                  ? messages[issue.message]
                  : undefined,
            },
          },
          { status: 400 },
        );
      }
      await prisma.message.create({
        data: { loanId: loan.id, senderId: userId, body: result.data.body },
      });
      return redirect(redirectTo);
    }
    default:
      throw new Response("Bad Request", { status: 400 });
  }
};

export default function LoanDetail({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { t } = useTranslation("loans");
  const { loan, actions, thread } = loaderData;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const otherPartyLabel =
    loan.otherPartyDisplayName ??
    t(
      loan.viewerRole === "owner"
        ? "labels.borrowerPlaceholder"
        : "labels.ownerPlaceholder",
    );

  return (
    <div>
      <h1>{loan.item.name}</h1>
      <p>
        {t("labels.status")}: {t(`status.${loan.status}`)}
      </p>
      <p>
        {t(loan.viewerRole === "owner" ? "labels.borrower" : "labels.owner")}:{" "}
        {otherPartyLabel}
      </p>

      {actions.canAccept ? (
        <Form method="post">
          <input type="hidden" name="intent" value="accept" />
          <Button type="submit" variant="primary">
            {t("buttons.accept")}
          </Button>
        </Form>
      ) : null}
      {actions.canDecline ? (
        <Form method="post">
          <input type="hidden" name="intent" value="decline" />
          <Button type="submit" variant="secondary">
            {t("buttons.decline")}
          </Button>
        </Form>
      ) : null}
      {actions.canCheckout ? (
        <Form method="post">
          <input type="hidden" name="intent" value="checkout" />
          <Button type="submit" variant="primary">
            {t("buttons.checkout")}
          </Button>
        </Form>
      ) : null}
      {actions.canConfirmReturn ? (
        <>
          <Form method="post">
            <input type="hidden" name="intent" value="confirm_return" />
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
        <Form method="post">
          <input type="hidden" name="intent" value="return" />
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

      <section aria-labelledby="messages-heading">
        <h2 id="messages-heading">{t("headings.messages")}</h2>
        {thread.isOpen ? (
          <>
            {thread.messages.length === 0 ? (
              <p>{t("notices.noMessages")}</p>
            ) : (
              <ol>
                {thread.messages.map((message) => (
                  <li key={message.id}>
                    <p>
                      {message.isMine ? t("labels.you") : otherPartyLabel}{" "}
                      <time dateTime={message.sentAt}>
                        {message.sentAtLabel}
                      </time>
                    </p>
                    <p>
                      {message.lines.map((line) => (
                        <Fragment key={line.offset}>
                          {line.offset > 0 ? <br /> : null}
                          {line.text}
                        </Fragment>
                      ))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <Form method="post">
              <input type="hidden" name="intent" value="send_message" />
              <TextArea
                label={t("labels.message")}
                name="body"
                required
                maxLength={BODY_MAX_LENGTH}
                errorMessage={actionData?.errors.body}
              />
              <Button type="submit" variant="primary">
                {t("buttons.send")}
              </Button>
            </Form>
          </>
        ) : (
          <p>{t("notices.messagingClosed")}</p>
        )}
      </section>

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
            <Form method="post">
              <input type="hidden" name="intent" value="cancel" />
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
