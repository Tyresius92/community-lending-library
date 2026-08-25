import { describe, expect, it } from "vitest";

import { prisma } from "~/db.server";
import { LoanFactory } from "~/factories/loan_factory.server";

import { expireIfNeeded, isExpired } from "./loan_expiry.server";

const ONE_HOUR_MS = 60 * 60 * 1000;
const PAST = new Date(Date.now() - ONE_HOUR_MS);
const FUTURE = new Date(Date.now() + ONE_HOUR_MS);

describe("isExpired", () => {
  it.each([
    { status: "pending", expiresAt: PAST, when: "past", expected: true },
    { status: "pending", expiresAt: FUTURE, when: "future", expected: false },
    { status: "accepted", expiresAt: PAST, when: "past", expected: false },
    { status: "active", expiresAt: PAST, when: "past", expected: false },
    { status: "completed", expiresAt: PAST, when: "past", expected: false },
    { status: "declined", expiresAt: PAST, when: "past", expected: false },
    { status: "cancelled", expiresAt: PAST, when: "past", expected: false },
    { status: "expired", expiresAt: PAST, when: "past", expected: false },
  ] as const)(
    "returns $expected for status $status with expiresAt in the $when",
    ({ status, expiresAt, expected }) => {
      expect(isExpired({ status, expiresAt })).toBe(expected);
    },
  );
});

describe("expireIfNeeded", () => {
  it("persists and returns status expired for a pending loan past its expiresAt", async () => {
    const loan = await LoanFactory.create({
      status: "pending",
      expiresAt: PAST,
    });

    const result = await expireIfNeeded(loan);

    expect(result.status).toBe("expired");
    const persisted = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
    });
    expect(persisted.status).toBe("expired");
  });

  it("returns the loan unchanged when not expired", async () => {
    const loan = await LoanFactory.create({
      status: "pending",
      expiresAt: FUTURE,
    });

    const result = await expireIfNeeded(loan);

    expect(result.status).toBe("pending");
    const persisted = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
    });
    expect(persisted.status).toBe("pending");
  });

  it("returns a non-pending loan unchanged even if expiresAt has passed", async () => {
    const loan = await LoanFactory.create({
      status: "accepted",
      expiresAt: PAST,
    });

    const result = await expireIfNeeded(loan);

    expect(result.status).toBe("accepted");
  });
});
