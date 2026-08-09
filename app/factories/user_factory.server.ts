import { faker } from "@faker-js/faker";

import { defineUserFactory } from "~/generated/fabbrica";

export const UserFactory = defineUserFactory({
  defaultData: () => ({
    email: faker.internet.email(),
  }),
});
