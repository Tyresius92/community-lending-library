import { faker } from "@faker-js/faker";

import { defineCommunityMembershipFactory } from "~/generated/fabbrica";

import { CommunityFactory } from "./community_factory.server";
import { UserFactory } from "./user_factory.server";

export const CommunityMembershipFactory = defineCommunityMembershipFactory({
  defaultData: () => ({
    displayName: faker.person.firstName(),
    user: UserFactory,
    community: CommunityFactory,
  }),
});
