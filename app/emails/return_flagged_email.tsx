import { Button, Heading, Section, Text } from "react-email";

import { emailT } from "~/emails/locale.server";

import { BaseLayout } from "./base_layout";

interface ReturnFlaggedEmailProps {
  itemName: string;
  loanUrl: string;
}

export function ReturnFlaggedEmail({
  itemName,
  loanUrl,
}: ReturnFlaggedEmailProps) {
  return (
    <BaseLayout preview={emailT("returnFlagged.preview", { itemName })}>
      <Heading style={styles.heading}>
        {emailT("returnFlagged.heading")}
      </Heading>

      <Text style={styles.body}>
        {emailT("returnFlagged.body", { itemName })}
      </Text>

      <Section style={styles.buttonContainer}>
        <Button href={loanUrl} style={styles.button}>
          {emailT("returnFlagged.button")}
        </Button>
      </Section>

      <Text style={styles.fallbackLabel}>
        {emailT("returnFlagged.fallbackLabel")}
      </Text>
      <Text style={styles.fallbackUrl}>{loanUrl}</Text>

      <Text style={styles.disclaimer}>
        {emailT("returnFlagged.disclaimer")}
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
