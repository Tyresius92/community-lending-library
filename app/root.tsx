import { useTranslation } from "react-i18next";
import type { LinksFunction } from "react-router";
import {
  Form,
  Links,
  Meta,
  Outlet,
  ScrollRestoration,
  Scripts,
} from "react-router";

import colorsHref from "~/components/_global_styles/colors.css?url";
import cssResetHref from "~/components/_global_styles/css_reset.css?url";
import spaceHref from "~/components/_global_styles/space.css?url";
import { Button } from "~/components/button/button";
import { i18nextMiddleware } from "~/i18n/middleware.server";
import { getUser } from "~/session.server";

import type { Route } from "./+types/root";
import { Box } from "./components/box/box";
import { Link } from "./components/link/link";

export const middleware: Route.MiddlewareFunction[] = [i18nextMiddleware];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: cssResetHref },
  { rel: "stylesheet", href: colorsHref },
  { rel: "stylesheet", href: spaceHref },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
  return { user: await getUser(request) };
};

export default function App({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const { t, i18n } = useTranslation("common");

  return (
    <html lang={i18n.language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header>
          <Box p={32} bg="sand-12" color="sand-1">
            <Box display="flex" justifyContent="space-between">
              <Box display="flex" gap={16}>
                <Link to="/">{t("siteName")}</Link>

                <Link to="/communities">{t("nav.browseCommunities")}</Link>

                <Link to="/communities/new">{t("nav.startACommunity")}</Link>
              </Box>
              {user ? (
                <Box display="flex" alignItems="center" gap={32}>
                  <span>{user.email}</span>
                  <Form action="/logout" method="post">
                    <Button type="submit">{t("nav.logout")}</Button>
                  </Form>
                </Box>
              ) : (
                <Link to="/login">{t("nav.logIn")}</Link>
              )}
            </Box>
          </Box>
        </header>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
