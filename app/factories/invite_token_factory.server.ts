import { defineInviteTokenFactory } from "~/generated/fabbrica";
import { generateInviteToken } from "~/utils/invite_token.server";

import { CommunityFactory } from "./community_factory.server";
import { UserFactory } from "./user_factory.server";

export const InviteTokenFactory = defineInviteTokenFactory({
  defaultData: () => ({
    token: generateInviteToken(),
    community: CommunityFactory,
    createdBy: UserFactory,
  }),
});
