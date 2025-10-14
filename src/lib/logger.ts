type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  code: string;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function emitLog(payload: LogPayload) {
  const { level, code, message, context, error } = payload;

  const structured = {
    level,
    code,
    message,
    context,
    error: error ? serializeError(error) : undefined,
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(structured, null, 2);

  switch (level) {
    case "debug":
      console.debug(serialized);
      break;
    case "info":
      console.info(serialized);
      break;
    case "warn":
      console.warn(serialized);
      break;
    case "error":
    default:
      console.error(serialized);
      break;
  }
}

export function logInfo(code: string, message: string, context?: Record<string, unknown>) {
  emitLog({ level: "info", code, message, context });
}

export function logWarn(code: string, message: string, context?: Record<string, unknown>) {
  emitLog({ level: "warn", code, message, context });
}

export function logError(
  code: string,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown,
) {
  emitLog({ level: "error", code, message, context, error });
}
