import { useState } from "react";
import { errorMessage, panelDownloadCsv, usePanel } from "./api";
import { QueryView } from "./QueryView";
import { Badge, Card, Empty, ghostBtn, inputClass, Stat, Table } from "./ui";
import { fmtNum, fmtUsd } from "./money";

type Classification = "free" | "free-model" | "paid" | "estimated" | "unknown";
interface Row {
  id: string; feature: string; label: string; operation: string; route: string | null; provider: string | null; model: string | null; modelFrom: string | null;
  classification: Classification; costBasis: "actual" | "estimated" | "bounded" | null; reason: string; requests: number; avgCalls: number | null;
  inputTokens: number | null; outputTokens: number | null; totalTokens: number | null;
  costPerGenerationUsd: number | null; costPerGenerationInr: number | null; cost100Usd: number | null; cost100Inr: number | null; cost1000Usd: number | null; cost1000Inr: number | null;
  maxCostPerGenerationUsd: number | null;
  rate: { inputPerM: number | null; outputPerM: number | null; inrPer1kChars: number | null; source: string; verifiedAt: string | null } | null;
  sharedEndpoint: boolean; note: string | null;
}
interface Data {
  from: string; to: string; note: string; formula: string; pricingVerifiedAt: string;
  fx: { rate: number; kind: "configured" | "reference"; asOf: string | null; source: string };
  rows: Row[]; counts: Record<Classification, number>;
  totals: { actualUsd: number; actualInr: number; estimatedUsd: number; estimatedInr: number; requestsWithActual: number; requestsWithEstimate: number; unpricedRequests: number };
  providerModel: { provider: string; model: string; operations: number; requests: number; actualUsd: number; estimatedUsd: number }[];
}

const LABEL: Record<Classification, string> = { free: "Free", "free-model": "Free model", paid: "Paid", estimated: "Estimated", unknown: "Unknown" };
const TONE: Record<Classification, "good" | "neutral" | "warn" | "bad"> = { free: "good", "free-model": "good", paid: "warn", estimated: "neutral", unknown: "bad" };
const inr = (v: number | null) => (v == null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: v < 1 ? 4 : 2 })}`);
const usd = (v: number | null) => fmtUsd(v);

/** AI Feature Cost Breakdown. Actual (provider-reported) and estimated (token x verified price) amounts are always shown apart. */
export function FeatureCostBreakdown({ from, to }: { from: string; to: string }) {
  const [feature, setFeature] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const range = `from=${from}&to=${to}`;
  const filters = [feature && `feature=${encodeURIComponent(feature)}`, provider && `provider=${encodeURIComponent(provider)}`, model.trim() && `model=${encodeURIComponent(model.trim())}`].filter(Boolean).join("&");
  const q = usePanel<Data>(`/costs/features?${range}${filters ? `&${filters}` : ""}`);
  const all = usePanel<Data>(`/costs/features?${range}`); // unfiltered, only to fill the filter lists
  const labelsByKey = new Map<string, Set<string>>();
  for (const r of all.data?.rows ?? []) labelsByKey.set(r.feature, (labelsByKey.get(r.feature) ?? new Set()).add(r.label));
  const features = [...labelsByKey.entries()].map(([k, l]) => [k, [...l].join(" / ")] as const).sort((a, b) => a[1].localeCompare(b[1]));
  const providers = [...new Set((all.data?.rows ?? []).map((r) => r.provider).filter((p): p is string => !!p))].sort();

  const exportCsv = async () => {
    setBusy(true); setMsg(null);
    try {
      await panelDownloadCsv(`/costs/features/export?${range}${filters ? `&${filters}` : ""}`, "mybhagya-feature-costs.csv");
      setMsg({ ok: true, text: "Exported the AI feature cost breakdown with the current filters. Recorded in the audit log." });
    } catch (e) { setMsg({ ok: false, text: errorMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="fcb-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="fcb-heading" className="text-xl font-semibold tracking-tight text-[#1F1B16]">AI feature cost breakdown</h3>
          <p className="mt-1 max-w-2xl text-sm text-[#6B6259]">What each AI operation costs per generation. <strong>Actual</strong> is the cost the provider reported on real requests. <strong>Estimated</strong> is recorded tokens times a verified price. <strong>Unknown</strong> is never shown as $0.</p>
        </div>
        <button className={ghostBtn} disabled={busy} onClick={exportCsv}>{busy ? "Preparing…" : "Export breakdown CSV"}</button>
      </div>

      <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Breakdown filters">
        <label className="text-sm text-[#4A423A]">Feature
          <select className={`${inputClass} mt-1 block`} value={feature} onChange={(e) => setFeature(e.target.value)}>
            <option value="">All features</option>
            {features.map(([k, l]) => <option key={k} value={k}>{l} ({k})</option>)}
          </select>
        </label>
        <label className="text-sm text-[#4A423A]">Provider
          <select className={`${inputClass} mt-1 block`} value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">All providers</option>
            <option value="none">None (no AI)</option>
            {providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-sm text-[#4A423A]">Model contains
          <input className={`${inputClass} mt-1 block`} value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gemma" maxLength={80} />
        </label>
      </div>
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}

      <QueryView q={q}>
        {(d) => {
          const section = (c: Classification, title: string, description: string) => {
            const rows = d.rows.filter((r) => r.classification === c);
            return (
              <Card key={c} title={`${title} (${rows.length})`} description={description}>
                {rows.length === 0 ? <Empty title={`No ${LABEL[c].toLowerCase()} operations match`} /> : (
                  <Table head={["Feature · operation", "Provider / model", "Requests", "Avg tokens in / out", "Per generation (USD)", "Per generation (INR)", "100 generations", "1,000 generations", "Basis"]}>
                    {rows.map((r) => (
                      <tr key={r.id} title={r.reason}>
                        <td className="px-3 py-2"><span className="block font-medium">{r.label}</span><span className="block text-xs text-[#6B6259]">{r.operation}{r.sharedEndpoint ? " · shared endpoint" : ""}</span></td>
                        <td className="px-3 py-2"><span className="block">{r.provider ?? "none"}</span><span className="block break-all text-xs text-[#6B6259]">{r.model ?? "—"}{r.modelFrom === "environment" ? " (env)" : ""}</span></td>
                        <td className="px-3 py-2 tabular-nums">{r.requests || "—"}</td>
                        <td className="px-3 py-2 tabular-nums">{r.inputTokens == null ? "—" : `${fmtNum(Math.round(r.inputTokens))} / ${fmtNum(Math.round(r.outputTokens ?? 0))}`}</td>
                        <td className="px-3 py-2 tabular-nums">{usd(r.costPerGenerationUsd)}{r.costPerGenerationUsd == null && r.maxCostPerGenerationUsd != null && <span className="block text-xs text-[#6B6259]">max {usd(r.maxCostPerGenerationUsd)}</span>}</td>
                        <td className="px-3 py-2 tabular-nums">{inr(r.costPerGenerationInr)}{r.costPerGenerationInr == null && r.maxCostPerGenerationUsd != null && <span className="block text-xs text-[#6B6259]">max {inr(r.maxCostPerGenerationUsd * d.fx.rate)}</span>}</td>
                        <td className="px-3 py-2 tabular-nums">{usd(r.cost100Usd)}<span className="block text-xs text-[#6B6259]">{inr(r.cost100Inr)}</span></td>
                        <td className="px-3 py-2 tabular-nums">{usd(r.cost1000Usd)}<span className="block text-xs text-[#6B6259]">{inr(r.cost1000Inr)}</span></td>
                        <td className="px-3 py-2"><Badge tone={TONE[r.classification]}>{r.costBasis === "actual" ? "Actual" : r.costBasis === "estimated" ? "Estimated" : LABEL[r.classification]}</Badge></td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            );
          };
          return (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Total actual cost" value={usd(d.totals.actualUsd)} hint={`${inr(d.totals.actualInr)} · ${fmtNum(d.totals.requestsWithActual)} requests, provider-reported`} />
                <Stat label="Total estimated cost" value={usd(d.totals.estimatedUsd)} hint={`${inr(d.totals.estimatedInr)} · ${fmtNum(d.totals.requestsWithEstimate)} requests, tokens x price`} />
                <Stat label="Requests with no cost" value={fmtNum(d.totals.unpricedRequests)} hint="Not counted as $0" tone={d.totals.unpricedRequests ? "bad" : "default"} />
                <Stat label="Pricing last verified" value={d.pricingVerifiedAt} hint={`Reference rates; ${d.counts.unknown} operation${d.counts.unknown === 1 ? "" : "s"} unknown`} />
              </div>
              <p className="text-xs text-[#6B6259]">
                {d.formula}. Exchange rate: 1 USD = ₹{d.fx.rate} ({d.fx.kind === "configured" ? `configured via ${d.fx.source}` : `reference rate from ${d.fx.source}, ${d.fx.asOf}`}); display only. Period {d.from} to {d.to}.
              </p>

              {section("paid", "Paid", "Provider-reported cost on real requests (actual).")}
              {section("estimated", "Estimated", "Recorded tokens multiplied by a verified or configured price.")}
              {section("free-model", "Free model", "AI is used, but the verified model price is $0.")}
              {section("unknown", "Unknown cost", "Not enough usage or pricing data. Hover a row for the reason.")}
              {section("free", "Free (no AI)", "No provider call on these paths.")}

              <Card title="Provider and model breakdown" description="Actual and estimated amounts are kept in separate columns.">
                {d.providerModel.length === 0 ? <Empty title="Nothing to show" /> : (
                  <Table head={["Provider", "Model", "Operations", "Requests", "Actual (USD)", "Estimated (USD)"]}>
                    {d.providerModel.map((p) => (
                      <tr key={`${p.provider}|${p.model}`}>
                        <td className="px-3 py-2">{p.provider}</td>
                        <td className="px-3 py-2 break-all">{p.model}</td>
                        <td className="px-3 py-2 tabular-nums">{p.operations}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtNum(p.requests)}</td>
                        <td className="px-3 py-2 tabular-nums">{usd(p.actualUsd)}</td>
                        <td className="px-3 py-2 tabular-nums">{usd(p.estimatedUsd)}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>

              <Card title="Price sources" description="Every price used for an estimate, with where it came from and when it was checked.">
                <Table head={["Provider / model", "Input / output per 1M tokens", "Source", "Verified"]}>
                  {d.rows.filter((r, i, a) => r.rate && a.findIndex((x) => x.provider === r.provider && x.model === r.model) === i).map((r) => (
                    <tr key={`${r.provider}|${r.model}`}>
                      <td className="px-3 py-2 break-all">{r.provider} · {r.model}</td>
                      <td className="px-3 py-2 tabular-nums">{r.rate!.inrPer1kChars != null ? `₹${r.rate!.inrPer1kChars.toFixed(2)} per 1,000 characters` : `${usd(r.rate!.inputPerM)} / ${usd(r.rate!.outputPerM)}`}</td>
                      <td className="px-3 py-2 break-all text-xs">{r.rate!.source}</td>
                      <td className="px-3 py-2">{r.rate!.verifiedAt ?? "configured"}</td>
                    </tr>
                  ))}
                </Table>
              </Card>
              <p className="text-xs text-[#6B6259]">{d.note}</p>
            </>
          );
        }}
      </QueryView>
    </section>
  );
}
