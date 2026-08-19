import { faker } from "@faker-js/faker";

import { defineLoanFactory } from "~/generated/fabbrica";

import { CommunityFactory } from "./community_factory.server";
import { ItemFactory } from "./item_factory.server";
import { UserFactory } from "./user_factory.server";

export const LoanFactory = defineLoanFactory({
  defaultData: () => ({
    item: ItemFactory,
    community: CommunityFactory,
    borrower: UserFactory,
    owner: UserFactory,
    status: "pending",
    expiresAt: faker.date.soon(),
  }),
});
