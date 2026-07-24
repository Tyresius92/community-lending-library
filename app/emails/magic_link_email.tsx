import { Button, Heading, Section, Text } from "react-email";

import { BaseLayout } from "./base_layout";

interface MagicLinkEmailProps {
  magicLinkUrl: string;
}

export function MagicLinkEmail({ magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <BaseLayout preview="Your login link — this link expires in 20 minutes.">
      <Heading style={styles.heading}>Log in</Heading>

      <Text style={styles.body}>
        Click the button below to log in. This link expires in 20 minutes and
        can only be used once.
      </Text>

      <Section style={styles.buttonContainer}>
        <Button href={magicLinkUrl} style={styles.button}>
          Log in
        </Button>
      </Section>

      <Text style={styles.fallbackLabel}>
        If the button doesn&apos;t work, copy this link into your browser:
      </Text>
      <Text style={styles.fallbackUrl}>{magicLinkUrl}</Text>

      <Text style={styles.disclaimer}>
        If you didn&apos;t request this email, you can safely ignore it.
      </Text>
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
