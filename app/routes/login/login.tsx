import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import {
  data,
  redirect,
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router";

import { MagicLinkEmail } from "~/emails/magic_link_email";
import { sendEmail } from "~/mailer.server";
import { createMagicLinkToken } from "~/models/magic_link.server";
import { findOrCreateUserByEmail } from "~/models/user.server";
import { getUserId } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";
import { getClientIp, isRateLimited } from "~/utils/rate_limit.server";

const MAGIC_LINK_ERROR_MESSAGES: Record<string, string> = {
  invalid: "That link isn't valid. Enter your email to get a new one.",
  expired: "That link has expired. Enter your email to get a new one.",
  used: "That link was already used. Enter your email to get a new one.",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");

  const magicLinkError = new URL(request.url).searchParams.get(
    "magicLinkError",
  );
  return data({
    magicLinkErrorMessage: magicLinkError
      ? (MAGIC_LINK_ERROR_MESSAGES[magicLinkError] ?? null)
      : null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/communities");

  if (!validateEmail(email)) {
    return data(
      { ok: false, email: null, errors: { email: "Email is invalid" } },
      { status: 400 },
    );
  }

  if (isRateLimited(`login:${getClientIp(request)}`)) {
    return data({ ok: true, email, errors: { email: null } });
  }

  const user = await findOrCreateUserByEmail(email);
  const token = await createMagicLinkToken(user.id);

  const magicLinkUrl = new URL("/magic_link", new URL(request.url).origin);
  magicLinkUrl.searchParams.set("token", token);
  magicLinkUrl.searchParams.set("redirectTo", redirectTo);

  if (process.env.NODE_ENV === "development") {
    console.log(magicLinkUrl.toString());
  }

  await sendEmail({
    to: email,
    subject: "Your login link",
    react: <MagicLinkEmail magicLinkUrl={magicLinkUrl.toString()} />,
  });

  return data({ ok: true, email, errors: { email: null } });
};

export const meta: MetaFunction = () => [{ title: "Log in" }];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/communities";
  const { magicLinkErrorMessage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    }
  }, [actionData]);

  if (actionData?.ok) {
    return (
      <div>
        <p>Check your email — we sent a login link to {actionData.email}.</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        {magicLinkErrorMessage ? <div>{magicLinkErrorMessage}</div> : null}
        <Form method="post">
          <div>
            <label htmlFor="email">Email address</label>
            <div>
              <input
                ref={emailRef}
                id="email"
                required
                autoFocus={true}
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={actionData?.errors?.email ? true : undefined}
                aria-describedby="email-error"
              />
              {actionData?.errors?.email ? (
                <div id="email-error">{actionData.errors.email}</div>
              ) : null}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button type="submit">Send login link</button>
        </Form>
      </div>
    </div>
  );
}
