import { usePanel } from "./api";
import { Badge, Card, fmtDate, Table } from "./ui";

interface Diag {
  captureInstalled: boolean; accountingEnabled: boolean; startedAt: string;
  counters: { providerCallsSeen: number; providerCallsWithoutRequestContext: number; providerCallsWithoutTokens: number; providerCallsWithoutCost: number; aiRowsPersisted: number; aiRowsPersistFailed: number };
  providersConfigured: Record<string, boolean>;
  pricingEntries: number; windowDays: number;
  features: { feature: string; requests: number; withAiUsage: number; succeededWithoutAi: number; notSuccessful: number }[];
  recent: { at: string; stage: string; provider?: string; feature?: string; reason?: string; persisted?: boolean }[];
  note: string;
}

/** Explains why AI usage might be missing, from this server process. Flags and counts only. */
export function CaptureStatus() {
  const q = usePanel<Diag>("/costs/diagnostics");
  return (
    <Card title="AI usage capture status" description="Why a request might show no provider, model or cost. This describes the server process answering this page.">
      {q.isLoading && <p className="text-sm text-[#6B6259]">Loading…</p>}
      {q.error && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Diagnostics are not available from this server ({q.error.message}). If it is running an older version of the backend, restart or redeploy it: an old process records activity without any AI usage.
        </p>
      )}
      {q.data && (
        <div className="space-y-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            {q.data.captureInstalled && q.data.accountingEnabled ? <Badge tone="good">Capture active</Badge> : <Badge tone="bad">{q.data.captureInstalled ? "Capture switched off (AI_USAGE_ACCOUNTING=off)" : "Capture not installed"}</Badge>}
            <span className="text-[#6B6259]">Server started {fmtDate(q.data.startedAt)} · {q.data.pricingEntries} price{q.data.pricingEntries === 1 ? "" : "s"} configured</span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[#6B6259]">Provider keys on this server:</span>
            {Object.entries(q.data.providersConfigured).map(([k, v]) => <Badge key={k} tone={v ? "good" : "warn"}>{k}: {v ? "set" : "not set"}</Badge>)}
          </p>
          <ul className="grid gap-1 text-xs text-[#4A423A] sm:grid-cols-2">
            <li>Provider calls seen since start: <strong>{q.data.counters.providerCallsSeen}</strong></li>
            <li>Usage rows saved: <strong>{q.data.counters.aiRowsPersisted}</strong>{q.data.counters.aiRowsPersistFailed ? <> · failed to save: <strong className="text-red-700">{q.data.counters.aiRowsPersistFailed}</strong></> : null}</li>
            <li>Calls with no token counts from the provider: <strong>{q.data.counters.providerCallsWithoutTokens}</strong></li>
            <li>Calls with no cost known: <strong>{q.data.counters.providerCallsWithoutCost}</strong></li>
            <li>Calls outside a customer request (not counted): <strong className={q.data.counters.providerCallsWithoutRequestContext ? "text-red-700" : ""}>{q.data.counters.providerCallsWithoutRequestContext}</strong></li>
          </ul>
          {q.data.features.length > 0 && (
            <Table head={["Feature (last 7 days)", "Requests", "With AI usage", "Succeeded, no AI usage", "Not successful"]}>
              {q.data.features.map((f) => (
                <tr key={f.feature}>
                  <td className="px-3 py-2 font-medium">{f.feature}</td>
                  <td className="px-3 py-2 tabular-nums">{f.requests}</td>
                  <td className="px-3 py-2 tabular-nums">{f.withAiUsage}</td>
                  <td className="px-3 py-2 tabular-nums">{f.succeededWithoutAi}</td>
                  <td className="px-3 py-2 tabular-nums">{f.notSuccessful}</td>
                </tr>
              ))}
            </Table>
          )}
          <p className="text-xs text-[#6B6259]">{q.data.note}</p>
        </div>
      )}
    </Card>
  );
}
