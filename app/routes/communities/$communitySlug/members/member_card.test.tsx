import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import resources from "~/i18n/resources";

import { MemberCard } from "./member_card";
import type { Member, MemberCardProps } from "./member_card";

const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    resources,
    defaultNS: "members",
    interpolation: { escapeValue: false },
  });
});

// MemberCard renders a react-router <Form>, which needs a data-router
// context to work at all (not just a declarative <MemoryRouter>) — wrapping
// with RouterProvider/createMemoryRouter around a single route is the
// minimal setup that satisfies it.
function renderMemberCard(
  member: Member,
  overrides: Partial<Omit<MemberCardProps, "member">> = {},
) {
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <I18nextProvider i18n={i18n}>
          <MemberCard
            member={member}
            communitySlug="test-community"
            canManage={true}
            {...overrides}
          />
        </I18nextProvider>
      ),
    },
  ]);

  return render(<RouterProvider router={router} />);
}

const baseMember: Member = {
  id: "member-1",
  displayName: "Jordan",
  role: "member",
  memberSince: "Aug 1, 2026",
  lendCount: 0,
  isSelf: false,
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

  describe("role-change button", () => {
    it("shows 'Promote to admin' for a manageable member row", () => {
      renderMemberCard({ ...baseMember, role: "member" });

      expect(
        screen.getByRole("button", { name: "Promote to admin" }),
      ).toBeInTheDocument();
    });

    it("shows 'Demote to member' for a manageable admin row", () => {
      renderMemberCard({ ...baseMember, role: "admin" });

      expect(
        screen.getByRole("button", { name: "Demote to member" }),
      ).toBeInTheDocument();
    });

    it("submits the target role as a hidden field", () => {
      renderMemberCard({ ...baseMember, role: "member" });

      expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
    });

    it("never renders for the owner's row, even when canManage is true", () => {
      renderMemberCard({ ...baseMember, role: "owner" });

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("never renders for the viewer's own row, even when canManage is true", () => {
      renderMemberCard({ ...baseMember, isSelf: true });

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("never renders when the viewer cannot manage members", () => {
      renderMemberCard(baseMember, { canManage: false });

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
