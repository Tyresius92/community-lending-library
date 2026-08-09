import { Button, Heading, Section, Text } from "react-email";

import { emailT } from "~/emails/locale.server";

import { BaseLayout } from "./base_layout";

interface MagicLinkEmailProps {
  magicLinkUrl: string;
}

export function MagicLinkEmail({ magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <BaseLayout preview={emailT("magicLink.preview")}>
      <Heading style={styles.heading}>{emailT("magicLink.heading")}</Heading>

      <Text style={styles.body}>{emailT("magicLink.body")}</Text>

      <Section style={styles.buttonContainer}>
        <Button href={magicLinkUrl} style={styles.button}>
          {emailT("magicLink.button")}
        </Button>
      </Section>

      <Text style={styles.fallbackLabel}>
        {emailT("magicLink.fallbackLabel")}
      </Text>
      <Text style={styles.fallbackUrl}>{magicLinkUrl}</Text>

      <Text style={styles.disclaimer}>{emailT("magicLink.disclaimer")}</Text>
    </BaseLayout>
  );
}

const styles = {
  heading: {
    fontSize: "18px",
    fontWeight: "bold" as const,
    margin: "0 0 12px",
  },
  body: {
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 20px",
  },
  buttonContainer: {
    margin: "0 0 20px",
  },
  button: {
    backgroundColor: "#18181b",
    borderRadius: "4px",
    color: "#ffffff",
    fontSize: "14px",
    padding: "12px 24px",
    textDecoration: "none",
  },
  fallbackLabel: {
    color: "#71717a",
    fontSize: "12px",
    margin: "0 0 4px",
  },
  fallbackUrl: {
    color: "#71717a",
    fontSize: "12px",
    margin: "0 0 20px",
    wordBreak: "break-all" as const,
  },
  disclaimer: {
    color: "#71717a",
    fontSize: "12px",
    margin: "0",
  },
} as const;
