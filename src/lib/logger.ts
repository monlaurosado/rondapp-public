import { env } from "@/lib/env";

type LogContext = Record<string, unknown>;

const shouldLog = env.appEnv !== "production";

function scrub(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(scrub);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (/token|secret|password|key|authorization/i.test(key)) {
        return [key, "[redacted]"];
      }
      return [key, scrub(entry)];
    }),
  );
}

export const logger = {
  info(message: string, context?: LogContext) {
    if (shouldLog) {
      console.info(message, context ? scrub(context) : undefined);
    }
  },
  warn(message: string, error?: unknown, context?: LogContext) {
    if (shouldLog) {
      console.warn(message, scrub({ error, ...context }));
    }
  },
  error(message: string, error?: unknown, context?: LogContext) {
    if (shouldLog) {
      console.error(message, scrub({ error, ...context }));
    }
  },
};
