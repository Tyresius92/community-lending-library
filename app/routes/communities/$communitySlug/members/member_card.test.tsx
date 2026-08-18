import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";

import resources from "~/i18n/resources";

import { MemberCard } from "./member_card";
import type { Member } from "./member_card";

const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    resources,
    defaultNS: "members",
    interpolation: { escapeValue: false },
  });
});

function renderMemberCard(member: Member) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemberCard member={member} />
    </I18nextProvider>,
  );
}

const baseMember: Member = {
  id: "member-1",
  displayName: "Jordan",
  role: "member",
  memberSince: "Aug 1, 2026",
  lendCount: 0,
};

describe("MemberCard", () => {
  it("renders the member's display name", () => {
    renderMemberCard(baseMember);

    expect(screen.getByText("Jordan")).toBeInTheDocument();
  });

  it.each([
    { role: "member", expected: "Member" },
    { role: "admin", expected: "Admin" },
    { role: "owner", expected: "Owner" },
  ] as const)(
    "renders the translated label for role $role",
    ({ role, expected }) => {
      renderMemberCard({ ...baseMember, role });

      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );

  it("renders the member-since date", () => {
    renderMemberCard(baseMember);

    expect(screen.getByText("Member since Aug 1, 2026")).toBeInTheDocument();
  });

  it("renders a singular lend count", () => {
    renderMemberCard({ ...baseMember, lendCount: 1 });

    expect(screen.getByText("1 completed loan")).toBeInTheDocument();
  });

  it("renders a plural lend count", () => {
    renderMemberCard({ ...baseMember, lendCount: 3 });

    expect(screen.getByText("3 completed loans")).toBeInTheDocument();
  });

  it("renders a zero lend count", () => {
    renderMemberCard({ ...baseMember, lendCount: 0 });

    expect(screen.getByText("0 completed loans")).toBeInTheDocument();
  });
});
