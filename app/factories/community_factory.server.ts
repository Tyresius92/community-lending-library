import { faker } from "@faker-js/faker";

import { defineCommunityFactory } from "~/generated/fabbrica";

import { UserFactory } from "./user_factory.server";

export const CommunityFactory = defineCommunityFactory({
  defaultData: () => ({
    name: faker.company.name(),
    slug: faker.lorem.slug(),
    owner: UserFactory,
  }),
});
