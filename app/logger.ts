import {
  addBreadcrumb,
  captureException,
  captureMessage,
  setUser,
  withScope,
} from "@sentry/react-router";

export type LogContext = Record<string, unknown>;

interface LoggerInterface {
  error(errorOrMessage: Error | string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  setUser(user: { id: string } | null): void;
}

const isDevelopment = process.env.NODE_ENV === "development";

export const logger: LoggerInterface = {
  error(errorOrMessage, context) {
    if (isDevelopment) {
      console.error(errorOrMessage, context);
      return;
    }

    if (errorOrMessage instanceof Error) {
      withScope((scope) => {
        if (context) {
          scope.setExtras(context);
        }
        captureException(errorOrMessage);
      });
    } else {
      captureMessage(errorOrMessage, { level: "error", extra: context });
    }
  },

  warn(message, context) {
    if (isDevelopment) {
      console.warn(message, context);
      return;
    }
    captureMessage(message, { level: "warning", extra: context });
  },

  info(message, context) {
    if (isDevelopment) {
      console.info(message, context);
      return;
    }
    addBreadcrumb({ message, level: "info", data: context });
  },

  setUser(user) {
    if (isDevelopment) {
      return;
    }
    setUser(user);
  },
};
