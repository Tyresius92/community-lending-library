import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { consumeMagicLinkToken } from "~/models/magic_link.server";
import { createUserSession } from "~/session.server";
import { safeRedirect } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"), "/notes");

  if (!token) {
    return redirect("/login");
  }

  const result = await consumeMagicLinkToken(token);

  if (result.status !== "ok") {
    return redirect(`/login?magicLinkError=${result.status}`);
  }

  return createUserSession({
    request,
    userId: result.userId,
    redirectTo,
  });
};

export default function MagicLink() {
  return null;
}
