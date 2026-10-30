/**
 * Safe, in-memory diagnostics for AI usage capture. They answer: was a provider call detected, did it have a request
 * to attach to, were model/tokens/cost found, and was the usage row persisted?
 * Only these flags and short identifiers are kept. Prompts, completions, user content, keys and tokens never reach here.
 * State is per server process and is lost on restart; nothing is written to the database.
 */
export interface DiagEvent {
  at: string;
  stage: "provider_call" | "persist";
  provider?: string;
  feature?: string;
  /** false = a provider was called outside any customer request, so the call cannot be attributed (not counted) */
  hasRequestContext?: boolean;
  httpOk?: boolean;
  modelFound?: boolean;
  tokensFound?: boolean;
  costFound?: boolean;
  costBasis?: string | null;
  persisted?: boolean;
  aiCalls?: number;
  reason?: string;
}

const MAX = 100;
const ring: DiagEvent[] = [];
const startedAt = new Date().toISOString();
const counters = {
  providerCallsSeen: 0,
  providerCallsWithoutRequestContext: 0,
  providerCallsWithoutTokens: 0,
  providerCallsWithoutCost: 0,
  aiRowsPersisted: 0,
  aiRowsPersistFailed: 0,
};
let installed = false;

export const markCaptureInstalled = () => {
  installed = true;
};

export function diag(e: Omit<DiagEvent, "at">): void {
  const ev: DiagEvent = { at: new Date().toISOString(), ...e };
  ring.push(ev);
  if (ring.length > MAX) ring.shift();
  if (e.stage === "provider_call") {
    counters.providerCallsSeen++;
    if (e.hasRequestContext === false) counters.providerCallsWithoutRequestContext++;
    else {
      if (e.tokensFound === false) counters.providerCallsWithoutTokens++;
      if (e.costFound === false) counters.providerCallsWithoutCost++;
    }
  } else if (e.stage === "persist") {
    if (e.persisted) counters.aiRowsPersisted++;
    else counters.aiRowsPersistFailed++;
  }
  if (process.env.AI_USAGE_DEBUG === "1") console.log("[ai-usage]", JSON.stringify(ev));
}

export function diagnosticsSnapshot() {
  return { captureInstalled: installed, accountingEnabled: process.env.AI_USAGE_ACCOUNTING !== "off", startedAt, counters: { ...counters }, recent: [...ring].reverse() };
}

export function resetDiagnostics(): void {
  ring.length = 0;
  for (const k of Object.keys(counters) as (keyof typeof counters)[]) counters[k] = 0;
}
