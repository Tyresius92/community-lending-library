import type { BrowserContext } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

import { findOrCreateUserByEmail } from "~/models/user.server";
import { createUserSession } from "~/session.server";

export async function loginAsNewUser(context: BrowserContext, email: string) {
  const user = await findOrCreateUserByEmail(email);

  const response = await createUserSession({
    request: new Request("http://localhost:3000/"),
    userId: user.id,
    redirectTo: "/",
  });

  const setCookie = response.headers.get("Set-Cookie");
  if (!setCookie) {
    throw new Error("Expected a Set-Cookie header from createUserSession");
  }
  const [name, value] = setCookie.split(";")[0].split("=");

  await context.addCookies([{ name, value, domain: "localhost", path: "/" }]);

  return user;
}
