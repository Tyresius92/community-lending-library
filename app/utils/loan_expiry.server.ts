import { prisma } from "~/db.server";
import type { LoanStatus } from "~/generated/prisma/client";

export interface ExpirableLoan {
  id: string;
  status: LoanStatus;
  expiresAt: Date;
}

export function isExpired(
  loan: Pick<ExpirableLoan, "status" | "expiresAt">,
): boolean {
  return loan.status === "pending" && loan.expiresAt < new Date();
}

export async function expireIfNeeded<T extends ExpirableLoan>(
  loan: T,
): Promise<T> {
  if (!isExpired(loan)) {
    return loan;
  }

  await prisma.loan.update({
    where: { id: loan.id },
    data: { status: "expired" },
  });

  return { ...loan, status: "expired" };
}
