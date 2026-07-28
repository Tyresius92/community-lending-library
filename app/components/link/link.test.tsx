import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Link } from "./link";

function renderWithRouter(children: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: children }]);
  return render(<RouterProvider router={router} />);
}

test("renders an internal link via react-router", () => {
  renderWithRouter(<Link to="/communities">Communities</Link>);
  const el = screen.getByRole("link", { name: "Communities" });
  expect(el).toHaveAttribute("href", "/communities");
});

test("renders an external link with the given href", () => {
  render(<Link href={new URL("https://example.com")}>Example</Link>);
  const el = screen.getByRole("link", { name: "Example" });
  expect(el).toHaveAttribute("href", "https://example.com/");
});

test("opens external links with newTab in a new tab safely", () => {
  render(
    <Link href={new URL("https://example.com")} newTab>
      Example
    </Link>,
  );
  const el = screen.getByRole("link", { name: "Example" });
  expect(el).toHaveAttribute("target", "_blank");
  expect(el).toHaveAttribute("rel", "noopener noreferrer");
});

test("does not set target/rel on external links by default", () => {
  render(<Link href={new URL("https://example.com")}>Example</Link>);
  const el = screen.getByRole("link", { name: "Example" });
  expect(el).not.toHaveAttribute("target");
});
