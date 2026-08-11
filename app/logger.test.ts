import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  withScope: vi.fn(
    (callback: (scope: { setExtras: (extras: unknown) => void }) => void) => {
      callback({ setExtras: sentryMocks.setExtras });
    },
  ),
  setExtras: vi.fn(),
}));

vi.mock("@sentry/react-router", () => sentryMocks);

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("logger outside development", () => {
  it("captures an Error via captureException", async () => {
    const { logger } = await import("./logger");
    const error = new Error("boom");

    logger.error(error);

    expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
  });

  it("attaches context as extras when capturing an Error", async () => {
    const { logger } = await import("./logger");
    const error = new Error("boom");

    logger.error(error, { userId: "123" });

    expect(sentryMocks.setExtras).toHaveBeenCalledWith({ userId: "123" });
  });

  it("captures a string message via captureMessage at error level", async () => {
    const { logger } = await import("./logger");

    logger.error("something went wrong", { itemId: "456" });

    expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
      "something went wrong",
      { level: "error", extra: { itemId: "456" } },
    );
  });

  it("sends warn as a warning-level captureMessage", async () => {
    const { logger } = await import("./logger");

    logger.warn("careful", { context: true });

    expect(sentryMocks.captureMessage).toHaveBeenCalledWith("careful", {
      level: "warning",
      extra: { context: true },
    });
  });

  it("sends info as an info-level breadcrumb", async () => {
    const { logger } = await import("./logger");

    logger.info("something happened", { context: true });

    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith({
      message: "something happened",
      level: "info",
      data: { context: true },
    });
  });

  it("forwards setUser to Sentry", async () => {
    const { logger } = await import("./logger");

    logger.setUser({ id: "user_1" });

    expect(sentryMocks.setUser).toHaveBeenCalledWith({ id: "user_1" });
  });

  it("forwards a null user to Sentry to clear it", async () => {
    const { logger } = await import("./logger");

    logger.setUser(null);

    expect(sentryMocks.setUser).toHaveBeenCalledWith(null);
  });
});

describe("logger in development", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  it("logs errors to the console instead of Sentry", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { logger } = await import("./logger");
    const error = new Error("boom");

    logger.error(error, { userId: "123" });

    expect(consoleError).toHaveBeenCalledWith(error, { userId: "123" });
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
  });

  it("logs warn to the console instead of Sentry", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { logger } = await import("./logger");

    logger.warn("careful");

    expect(consoleWarn).toHaveBeenCalledWith("careful", undefined);
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
  });

  it("logs info to the console instead of Sentry", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const { logger } = await import("./logger");

    logger.info("fyi");

    expect(consoleInfo).toHaveBeenCalledWith("fyi", undefined);
    expect(sentryMocks.addBreadcrumb).not.toHaveBeenCalled();
  });

  it("does not forward setUser to Sentry", async () => {
    const { logger } = await import("./logger");

    logger.setUser({ id: "user_1" });

    expect(sentryMocks.setUser).not.toHaveBeenCalled();
  });
});
