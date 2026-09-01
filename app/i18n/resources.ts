import type { Resource } from "i18next";

import common from "~/locales/en/common.json";
import communities from "~/locales/en/communities.json";
import home from "~/locales/en/home.json";
import invite from "~/locales/en/invite.json";
import items from "~/locales/en/items.json";
import loans from "~/locales/en/loans.json";
import login from "~/locales/en/login.json";
import members from "~/locales/en/members.json";

const en = {
  common,
  home,
  login,
  communities,
  items,
  loans,
  members,
  invite,
};

const resources = { en } satisfies Resource;

export default resources;

export const supportedLngs =
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.keys is typed as returning string[]; there's no sound way to recover the literal key type without a cast.
  Object.keys(resources) as (keyof typeof resources)[];
export const fallbackLng: (typeof supportedLngs)[number] = "en";
export const defaultNS = "common";
