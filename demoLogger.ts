// Demo logger — console only, never touches UI.
// Use this during your cold-start test to see exactly what the system is doing.

type LogLevel = "info" | "warn" | "error" | "perf";

const PREFIX: Record<LogLevel, string> = {
  info:  "🔵 [CF]",
  warn:  "🟡 [CF]",
  error: "🔴 [CF]",
  perf:  "⚡ [CF]",
};

function log(level: LogLevel, message: string, data?: unknown): void {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `${PREFIX[level]} ${ts}`;
  if (data !== undefined) {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](prefix, message, data);
  } else {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](prefix, message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const demoLog = {
  captureStart: () =>
    log("info", "Capture initiated"),

  captureCanvas: (ms: number) =>
    log("perf", `html2canvas render: ${ms}ms`),

  apiStart: () =>
    log("info", "POST /api/captures →"),

  apiComplete: (ms: number, status: number) =>
    log(status < 400 ? "perf" : "error", `API response: ${status} in ${ms}ms`),

  llmStart: (method: "vision" | "text") =>
    log("info", `LLM call started (${method})`),

  llmComplete: (ms: number) =>
    log("perf", `LLM response: ${ms}ms`),

  firewallPath: (path: "valid" | "normalized" | "fallback", detail?: string) =>
    log(
      path === "valid" ? "info" : path === "normalized" ? "warn" : "error",
      `Firewall: ${path}${detail ? ` — ${detail}` : ""}`
    ),

  cardRendered: (id: string, type: string, title: string) =>
    log("info", `Card rendered [${type}]: "${title.slice(0, 50)}"`, { id }),

  placeholderShown: (id: string) =>
    log("info", `Placeholder card shown`, { id }),

  placeholderReplaced: (id: string, ms: number) =>
    log("perf", `Placeholder replaced with real card in ${ms}ms`, { id }),

  error: (context: string, err: unknown) =>
    log("error", `Error in ${context}`, err),
};

// ── Latency timer util ────────────────────────────────────────────────────────

export function startTimer(): () => number {
  const t = performance.now();
  return () => Math.round(performance.now() - t);
}
