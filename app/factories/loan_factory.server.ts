import { faker } from "@faker-js/faker";

import { defineLoanFactory } from "~/generated/fabbrica";

import { CommunityFactory } from "./community_factory.server";
import { ItemFactory } from "./item_factory.server";
import { UserFactory } from "./user_factory.server";

// `item`, `community`, `borrower`, and `owner` all default independently, so
// each builds its own unrelated row. Callers that need a self-consistent
// loan (item/community/owner actually related to each other) must override
// with `connect`.
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
