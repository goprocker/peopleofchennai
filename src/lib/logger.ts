type Level = "debug" | "info" | "warn" | "error";

const REDACT = /(email|password|token|secret|key|phone)/i;

function redact(meta: Record<string, unknown> | undefined) {
  if (!meta) return undefined;
  return Object.fromEntries(
    Object.entries(meta).map(([k, v]) => [k, REDACT.test(k) ? "[redacted]" : v]),
  );
}

function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...redact(meta) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => log("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => log("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => log("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => log("error", m, meta),
};
