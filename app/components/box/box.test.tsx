import { render, screen } from "@testing-library/react";

import { Box } from "./box";
import styles from "./box.module.css";

test("renders a div by default", () => {
  render(<Box>content</Box>);
  const el = screen.getByText("content");
  expect(el.tagName).toBe("DIV");
});

test("renders the tag given by the as prop", () => {
  render(<Box as="section">content</Box>);
  const el = screen.getByText("content");
  expect(el.tagName).toBe("SECTION");
});

test("forwards id and role", () => {
  render(
    <Box id="my-box" role="group">
      content
    </Box>,
  );
  const el = screen.getByRole("group");
  expect(el).toHaveAttribute("id", "my-box");
});

describe("responsive spacing", () => {
  test("a bare number sets the xs custom property", () => {
    render(<Box pb={16}>content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-pb-xs: var(--space-16)");
  });

  test("a breakpoint object sets only the given breakpoints", () => {
    render(<Box pb={{ m: 32 }}>content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).not.toContain("--box-pb-xs");
    expect(style).toContain("--box-pb-m: var(--space-32)");
  });

  test("p shorthand sets all four sides", () => {
    render(<Box p={12}>content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-pt-xs: var(--space-12)");
    expect(style).toContain("--box-pb-xs: var(--space-12)");
    expect(style).toContain("--box-pl-xs: var(--space-12)");
    expect(style).toContain("--box-pr-xs: var(--space-12)");
  });

  test("px shorthand sets left and right only", () => {
    render(<Box px={8}>content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-pl-xs: var(--space-8)");
    expect(style).toContain("--box-pr-xs: var(--space-8)");
    expect(style).not.toContain("--box-pt-xs");
    expect(style).not.toContain("--box-pb-xs");
  });

  test("a specific side overrides px at the same breakpoint", () => {
    render(
      <Box px={8} pl={24}>
        content
      </Box>,
    );
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-pl-xs: var(--space-24)");
    expect(style).toContain("--box-pr-xs: var(--space-8)");
  });

  test("a specific side overrides px only at the breakpoint it sets", () => {
    render(
      <Box px={8} pl={{ m: 24 }}>
        content
      </Box>,
    );
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-pl-xs: var(--space-8)");
    expect(style).toContain("--box-pl-m: var(--space-24)");
    expect(style).toContain("--box-pr-xs: var(--space-8)");
  });

  test("sets margin custom properties from mb", () => {
    render(<Box mb={16}>content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-mb-xs: var(--space-16)");
  });

  test("gap shorthand sets both row-gap and col-gap", () => {
    render(
      <Box display="flex" gap={8}>
        content
      </Box>,
    );
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-row-gap-xs: var(--space-8)");
    expect(style).toContain("--box-col-gap-xs: var(--space-8)");
  });

  test("rowGap overrides gap for row-gap only", () => {
    render(
      <Box display="flex" gap={8} rowGap={16}>
        content
      </Box>,
    );
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("--box-row-gap-xs: var(--space-16)");
    expect(style).toContain("--box-col-gap-xs: var(--space-8)");
  });

  test("applies the .box class when spacing props are provided", () => {
    render(<Box pb={8}>content</Box>);
    expect(screen.getByText("content")).toHaveClass(styles.box!);
  });

  test("does not apply the .box class when no spacing props are provided", () => {
    render(<Box bg="sand-3">content</Box>);
    expect(screen.getByText("content")).not.toHaveClass(styles.box!);
  });
});

describe("color props", () => {
  test("applies bg as a background-color style", () => {
    render(<Box bg="sand-3">content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("background-color: var(--color-sand-3)");
  });

  test("applies color as a color style", () => {
    render(<Box color="sand-12">content</Box>);
    const style = screen.getByText("content").getAttribute("style") ?? "";
    expect(style).toContain("color: var(--color-sand-12)");
  });
});

describe("flexbox props", () => {
  test("applies display flex and flex-container props", () => {
    render(
      <Box display="flex" flexDirection="column" justifyContent="center">
        content
      </Box>,
    );
    expect(screen.getByText("content")).toHaveStyle({
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    });
  });

  test("applies flex-item props without display flex", () => {
    render(
      <Box flexGrow={1} flexShrink={0} alignSelf="center">
        content
      </Box>,
    );
    expect(screen.getByText("content")).toHaveStyle({
      flexGrow: "1",
      flexShrink: "0",
      alignSelf: "center",
    });
  });
});

describe("role prop", () => {
  test("passes role attribute to the rendered element", () => {
    render(<Box role="alert">error message</Box>);
    expect(screen.getByRole("alert")).toHaveTextContent("error message");
  });

  test("does not render a role attribute when not provided", () => {
    render(<Box>content</Box>);
    expect(screen.getByText("content")).not.toHaveAttribute("role");
  });
});
