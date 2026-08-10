import { useTranslation } from "react-i18next";

import { getInstance, getLocale } from "~/i18n/middleware.server";

import type { Route } from "./+types/_index";

export const loader = ({ context }: Route.LoaderArgs) => {
  const t = getInstance(context).getFixedT(getLocale(context), "home");
  return { title: t("meta.title") };
};

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
];

export default function Index() {
  const { t } = useTranslation("home");

  return (
    <main>
      <h1>{t("hero.heading")}</h1>
      <p>{t("hero.tagline")}</p>
    </main>
  );
}
