import type { Resource } from "i18next";

import common from "~/locales/en/common.json";
import communities from "~/locales/en/communities.json";
import home from "~/locales/en/home.json";
import login from "~/locales/en/login.json";

const en = { common, home, login, communities };

const resources = { en } satisfies Resource;

export default resources;

export const supportedLngs = Object.keys(
  resources,
) as (keyof typeof resources)[];
export const fallbackLng: (typeof supportedLngs)[number] = "en";
export const defaultNS = "common";
