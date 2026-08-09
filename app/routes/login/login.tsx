import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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

import { emailT } from "~/emails/locale.server";
import { MagicLinkEmail } from "~/emails/magic_link_email";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { sendEmail } from "~/mailer.server";
import { createMagicLinkToken } from "~/models/magic_link.server";
import { findOrCreateUserByEmail } from "~/models/user.server";
import { getUserId } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";
import { getClientIp, isRateLimited } from "~/utils/rate_limit.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");

  const t = getInstance(context).getFixedT(getLocale(context), "login");
  const magicLinkErrorMessages: Record<string, string> = {
    invalid: t("magicLinkErrors.invalid"),
    expired: t("magicLinkErrors.expired"),
    used: t("magicLinkErrors.used"),
  };

  const magicLinkError = new URL(request.url).searchParams.get(
    "magicLinkError",
  );
  return data({
    title: t("meta.title"),
    magicLinkErrorMessage: magicLinkError
      ? (magicLinkErrorMessages[magicLinkError] ?? null)
      : null,
  });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const t = getInstance(context).getFixedT(getLocale(context), "login");
  const formData = await request.formData();
  const email = formData.get("email");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/communities");

  if (!validateEmail(email)) {
    return data(
      {
        ok: false,
        email: null,
        errors: { email: t("errors.emailInvalid") },
      },
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
    subject: emailT("magicLink.subject"),
    react: <MagicLinkEmail magicLinkUrl={magicLinkUrl.toString()} />,
  });

  return data({ ok: true, email, errors: { email: null } });
};

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData?.title },
];

export default function LoginPage() {
  const { t } = useTranslation("login");
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
        <p>{t("checkEmail", { email: actionData.email })}</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        {magicLinkErrorMessage ? <div>{magicLinkErrorMessage}</div> : null}
        <Form method="post">
          <div>
            <label htmlFor="email">{t("labels.email")}</label>
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
          <button type="submit">{t("buttons.submit")}</button>
        </Form>
      </div>
    </div>
  );
}
