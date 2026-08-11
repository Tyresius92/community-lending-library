import type { ReactElement } from "react";
import { render } from "react-email";
import { Resend } from "resend";

import { logger } from "~/logger";

const FROM_EMAIL =
  process.env.FROM_EMAIL ?? "Community Lending Library <onboarding@resend.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const html = await render(react);

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[email] To: ${to} | Subject: ${subject}\n${html}\n`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set — skipping email", { to, subject });
    return;
  }

  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
}
