import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

interface BaseLayoutProps {
  preview: string;
  children: ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.siteName}>Community Lending Library</Heading>
            <Hr style={styles.divider} />
          </Section>

          <Section>{children}</Section>

          <Section style={styles.footer}>
            <Hr style={styles.divider} />
            <Text style={styles.footerText}>Community Lending Library</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily: "Helvetica, Arial, sans-serif",
    margin: "0",
    padding: "32px 16px",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "4px",
    margin: "0 auto",
    maxWidth: "480px",
    padding: "32px",
  },
  header: {
    marginBottom: "16px",
  },
  siteName: {
    fontSize: "20px",
    fontWeight: "bold" as const,
    margin: "0 0 16px",
  },
  divider: {
    borderColor: "#e4e4e7",
    borderTopWidth: "1px",
    margin: "0",
  },
  footer: {
    marginTop: "24px",
  },
  footerText: {
    color: "#71717a",
    fontSize: "12px",
    margin: "12px 0 0",
  },
} as const;
