import { faker } from "@faker-js/faker";

import { defineItemFactory } from "~/generated/fabbrica";

import { CommunityFactory } from "./community_factory.server";
import { CommunityMembershipFactory } from "./community_membership_factory.server";

// `community` and `ownerMembership` default independently, so each builds its
// own unrelated Community/CommunityMembership. Callers that need a
// self-consistent item (the membership actually belonging to the item's
// community) must override both with `connect`.
export const ItemFactory = defineItemFactory({
  defaultData: () => ({
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    ownerMembership: CommunityMembershipFactory,
    community: CommunityFactory,
  }),
});
