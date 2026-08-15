import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { data, redirect, Form, useSearchParams } from "react-router";

import { TextInput } from "~/components/text_input/text_input";
import { emailT } from "~/emails/locale.server";
import { MagicLinkEmail } from "~/emails/magic_link_email";
import { getInstance, getLocale } from "~/i18n/middleware.server";
import { sendEmail } from "~/mailer.server";
import { createMagicLinkToken } from "~/models/magic_link.server";
import { findOrCreateUserByEmail } from "~/models/user.server";
import { loginSchema } from "~/schemas/login.server";
import { getUserId } from "~/session.server";
import { safeRedirect } from "~/utils";
import { getClientIp, isRateLimited } from "~/utils/rate_limit.server";

import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.title },
];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }

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

export const action = async ({ request, context }: Route.ActionArgs) => {
  const t = getInstance(context).getFixedT(getLocale(context), "login");
  const formData = await request.formData();
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/communities");

  const result = loginSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return data(
      {
        ok: false as const,
        email: null,
        errors: { email: t("errors.emailInvalid") },
      },
      { status: 400 },
    );
  }

  const { email } = result.data;

  if (isRateLimited(`login:${getClientIp(request)}`)) {
    return data({ ok: true as const, email, errors: { email: null } });
  }

  const user = await findOrCreateUserByEmail(email);
  const token = await createMagicLinkToken(user.id);

  const magicLinkUrl = new URL("/magic_link", new URL(request.url).origin);
  magicLinkUrl.searchParams.set("token", token);
  magicLinkUrl.searchParams.set("redirectTo", redirectTo);

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(magicLinkUrl.toString());
  }

  await sendEmail({
    to: email,
    subject: emailT("magicLink.subject"),
    react: <MagicLinkEmail magicLinkUrl={magicLinkUrl.toString()} />,
  });

  return data({ ok: true as const, email, errors: { email: null } });
};

export default function LoginPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { t } = useTranslation("login");
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/communities";
  const { magicLinkErrorMessage } = loaderData;
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors.email) {
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
          <TextInput
            ref={emailRef}
            label={t("labels.email")}
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            errorMessage={actionData?.errors.email ?? undefined}
          />

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button type="submit">{t("buttons.submit")}</button>
        </Form>
      </div>
    </div>
  );
}
