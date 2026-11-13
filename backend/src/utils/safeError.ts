// Log-safe error description.
//
// `console.error("...", err)` on an axios/provider error prints the whole error object, including
// `config.headers.Authorization` (the provider API key) and `config.data` (the prompt, which can
// carry birth details). `describeError` keeps what's useful for diagnosing — error class, message,
// code, HTTP status, a bounded provider message, a short stack — and nothing else.

const MAX_MESSAGE = 300;
const MAX_STACK_LINES = 6;

// Credential-looking substrings that can still appear inside a message or a provider response body.
const REDACTIONS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]"],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, "[redacted-jwt]"],
  [/\b(sk|gsk|rzp_live|rzp_test|pk|xai)[-_][A-Za-z0-9_-]{12,}/g, "[redacted-key]"],
  [/(api[-_ ]?key|secret|token|password|authorization)(["']?\s*[:=]\s*["']?)[^\s"',}]{6,}/gi, "$1$2[redacted]"],
  [/(postgres(?:ql)?:\/\/[^:\s/]+):[^@\s]+@/gi, "$1:[redacted]@"],
];

export function redactSecrets(text: string): string {
  return REDACTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

function clip(text: string): string {
  const clean = redactSecrets(text).replace(/\s+/g, " ").trim();
  return clean.length > MAX_MESSAGE ? `${clean.slice(0, MAX_MESSAGE)}…` : clean;
}

function providerMessage(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === "string") return clip(data);
  if (typeof data === "object") {
    const d = data as Record<string, any>;
    const candidate = d.error?.message ?? d.error?.error ?? d.message ?? d.error ?? d.detail;
    if (typeof candidate === "string") return clip(candidate);
    if (candidate && typeof candidate === "object" && typeof candidate.message === "string") return clip(candidate.message);
  }
  return "[unrecognised provider error body omitted]";
}

export type SafeErrorInfo = {
  name: string;
  message: string;
  code?: string | number;
  status?: number;
  providerMessage?: string;
  stack?: string;
};

/** Plain, JSON-safe, secret-free description of anything that was thrown. */
export function describeError(err: unknown): SafeErrorInfo {
  if (err === null || err === undefined) return { name: "UnknownError", message: String(err) };
  if (typeof err !== "object") return { name: "NonErrorThrown", message: clip(String(err)) };

  const e = err as Record<string, any>;
  const info: SafeErrorInfo = {
    name: typeof e.name === "string" ? e.name : "Error",
    message: clip(typeof e.message === "string" ? e.message : "No message"),
  };
  if (typeof e.code === "string" || typeof e.code === "number") info.code = e.code;

  // axios-style: the HTTP status and body of the *response*; never `config`, `request` or `headers`.
  const status = e.response?.status ?? (typeof e.statusCode === "number" ? e.statusCode : undefined) ?? (typeof e.status === "number" ? e.status : undefined);
  if (typeof status === "number") info.status = status;
  const body = providerMessage(e.response?.data);
  if (body) info.providerMessage = body;

  if (typeof e.stack === "string") {
    info.stack = redactSecrets(e.stack).split("\n").slice(0, MAX_STACK_LINES).join("\n");
  }
  return info;
}

/** Drop-in replacement for `console.error(label, err)` at call sites that handle provider errors. */
export function logError(label: string, err: unknown): void {
  console.error(label, describeError(err));
}
