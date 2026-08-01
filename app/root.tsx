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
import spaceHref from "~/components/_global_styles/space.css?url";
import { Button } from "~/components/button/button";
import { getUser } from "~/session.server";

import type { Route } from "./+types/root";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: colorsHref },
  { rel: "stylesheet", href: spaceHref },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
  return { user: await getUser(request) };
};

export default function App({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {user ? (
          <div>
            <span>{user.email}</span>
            <Form action="/logout" method="post">
              <Button type="submit">Logout</Button>
            </Form>
          </div>
        ) : null}
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
