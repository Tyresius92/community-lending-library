import { faker } from "@faker-js/faker";

import { defineMessageFactory } from "~/generated/fabbrica";

import { LoanFactory } from "./loan_factory.server";
import { UserFactory } from "./user_factory.server";

export const MessageFactory = defineMessageFactory({
  defaultData: () => ({
    loan: LoanFactory,
    sender: UserFactory,
    body: faker.lorem.sentence(),
  }),
});
