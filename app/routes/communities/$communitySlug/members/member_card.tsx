import { useTranslation } from "react-i18next";

import { Box } from "~/components/box/box";
import type { CommunityRole } from "~/generated/prisma/client";

export interface Member {
  id: string;
  displayName: string;
  role: CommunityRole;
  memberSince: string;
  lendCount: number;
}

export interface MemberCardProps {
  member: Member;
}

export const MemberCard = ({ member }: MemberCardProps) => {
  const { t } = useTranslation("members");

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
        <p>{member.displayName}</p>
        <p>{t(`roles.${member.role}`)}</p>
      </div>
      <p>{t("labels.memberSince", { date: member.memberSince })}</p>
      <p>{t("labels.lendCount", { count: member.lendCount })}</p>
    </Box>
  );
};
