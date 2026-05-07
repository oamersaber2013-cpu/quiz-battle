import * as Sentry from "@sentry/node";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
    console.log("Sentry initialized");
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error("Error:", error);
  
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}
