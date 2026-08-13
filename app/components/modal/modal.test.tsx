import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { Modal } from "./modal";

test("renders with the given accessible name when open", () => {
  render(
    <Modal
      isOpen
      setIsOpen={() => undefined}
      title="Delete this item?"
      closeLabel="Close"
      content={<p>This cannot be undone.</p>}
    />,
  );
  expect(
    screen.getByRole("dialog", { name: "Delete this item?" }),
  ).toBeVisible();
});

test("is not visible when closed", () => {
  render(
    <Modal
      isOpen={false}
      setIsOpen={() => undefined}
      title="Delete this item?"
      closeLabel="Close"
      content={<p>This cannot be undone.</p>}
    />,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("calls setIsOpen(false) when the close button is clicked", () => {
  const setIsOpen = vi.fn();
  render(
    <Modal
      isOpen
      setIsOpen={setIsOpen}
      title="Delete this item?"
      closeLabel="Close"
      content={<p>This cannot be undone.</p>}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(setIsOpen).toHaveBeenCalledWith(false);
});

test("calls setIsOpen(false) when the dialog's native close event fires", () => {
  const setIsOpen = vi.fn();
  render(
    <Modal
      isOpen
      setIsOpen={setIsOpen}
      title="Delete this item?"
      closeLabel="Close"
      content={<p>This cannot be undone.</p>}
    />,
  );
  fireEvent(screen.getByRole("dialog"), new Event("close"));
  expect(setIsOpen).toHaveBeenCalledWith(false);
});

test("renders the given content", () => {
  render(
    <Modal
      isOpen
      setIsOpen={() => undefined}
      title="Delete this item?"
      closeLabel="Close"
      content={<button type="submit">Confirm delete</button>}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Confirm delete" }),
  ).toBeInTheDocument();
});
