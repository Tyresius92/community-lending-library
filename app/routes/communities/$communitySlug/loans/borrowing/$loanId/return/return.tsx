import { redirect } from "react-router";

import { prisma } from "~/db.server";
import { emailT } from "~/emails/locale.server";
import { ReturnFlaggedEmail } from "~/emails/return_flagged_email";
import { sendEmail } from "~/mailer.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";
import { expireIfNeeded } from "~/utils/loan_expiry.server";

import type { Route } from "./+types/return";

export const action = async ({ params, request, url }: Route.ActionArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  const loan = await prisma.loan.findFirst({
    where: {
      id: params.loanId,
      communityId: found.community.id,
      borrowerId: userId,
    },
    include: {
      item: { select: { name: true } },
      owner: { select: { email: true } },
    },
  });
  if (!loan) {
    throw new Response("Not Found", { status: 404 });
  }

  const current = await expireIfNeeded(loan);
  if (
    current.status !== "active" ||
    current.borrowerConfirmedReturnAt !== null
  ) {
    return new Response(null, { status: 403 });
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
    subject: emailT("returnFlagged.subject", { itemName: loan.item.name }),
    react: (
      <ReturnFlaggedEmail
        itemName={loan.item.name}
        loanUrl={loanUrl.toString()}
      />
    ),
  });

  return redirect(`/communities/${params.communitySlug}/loans/borrowing`);
};
