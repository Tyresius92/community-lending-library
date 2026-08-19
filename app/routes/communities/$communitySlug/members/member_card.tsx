import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";

import { Box } from "~/components/box/box";
import { Button } from "~/components/button/button";
import { Modal } from "~/components/modal/modal";
import type { CommunityRole } from "~/generated/prisma/client";

export interface Member {
  id: string;
  displayName: string;
  role: CommunityRole;
  memberSince: string;
  lendCount: number;
  isSelf: boolean;
}

export interface MemberCardProps {
  member: Member;
  communitySlug: string;
  canManage: boolean;
}

export const MemberCard = ({
  member,
  communitySlug,
  canManage,
}: MemberCardProps) => {
  const { t } = useTranslation("members");
  const nameId = useId();
  const [isKickModalOpen, setIsKickModalOpen] = useState(false);

  // The owner's role/membership only changes via a (not-yet-built) ownership
  // transfer flow, and a viewer can never act on their own row — mirrored
  // server-side in role.tsx/kick.tsx, this is just where the buttons
  // disappear from.
  const canManageMember =
    canManage && !member.isSelf && member.role !== "owner";

  return (
    <Box
      as="article"
      display="flex"
      flexWrap="wrap"
      justifyContent="space-between"
      alignItems="center"
      gap={8}
      p={8}
    >
      <div>
        <p id={nameId}>{member.displayName}</p>
        <p>{t(`roles.${member.role}`)}</p>
      </div>
      <p>{t("labels.memberSince", { date: member.memberSince })}</p>
      <p>{t("labels.lendCount", { count: member.lendCount })}</p>
      {canManageMember ? (
        <>
          <Form
            method="post"
            action={`/communities/${communitySlug}/members/${member.id}/role`}
          >
            <input
              type="hidden"
              name="role"
              value={member.role === "admin" ? "member" : "admin"}
            />
            <Button type="submit" aria-describedby={nameId}>
              {member.role === "admin"
                ? t("buttons.demoteToMember")
                : t("buttons.promoteToAdmin")}
            </Button>
          </Form>
          <Button
            variant="danger"
            aria-describedby={nameId}
            onClick={() => {
              setIsKickModalOpen(true);
            }}
          >
            {t("buttons.removeFromCommunity")}
          </Button>
          <Modal
            isOpen={isKickModalOpen}
            setIsOpen={setIsKickModalOpen}
            title={t("notices.confirmRemoveTitle", {
              name: member.displayName,
            })}
            closeLabel={t("buttons.close")}
            content={
              <>
                <p>{t("notices.confirmRemoveBody")}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsKickModalOpen(false);
                  }}
                >
                  {t("buttons.cancel")}
                </Button>
                <Form
                  method="post"
                  action={`/communities/${communitySlug}/members/${member.id}/kick`}
                >
                  <Button type="submit" variant="danger">
                    {t("buttons.confirmRemove")}
                  </Button>
                </Form>
              </>
            }
          />
        </>
      ) : null}
    </Box>
  );
};
