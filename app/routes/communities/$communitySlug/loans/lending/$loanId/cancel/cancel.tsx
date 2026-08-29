import { redirect } from "react-router";

import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";
import { expireIfNeeded } from "~/utils/loan_expiry.server";

import type { Route } from "./+types/cancel";

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
      ownerId: userId,
    },
  });
  if (!loan) {
    throw new Response("Not Found", { status: 404 });
  }

  const current = await expireIfNeeded(loan);
  if (current.status !== "accepted" || current.checkedOutAt !== null) {
    return new Response(null, { status: 403 });
  }

  await prisma.loan.update({
    where: { id: loan.id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledByRole: "owner",
    },
  });

  return redirect(`/communities/${params.communitySlug}/loans/lending`);
};
