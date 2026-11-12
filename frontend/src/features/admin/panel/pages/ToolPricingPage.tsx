import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { panelSend, usePanel, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, fmtDate, PageHeader, Table } from "../ui";

interface ToolPriceRow {
  toolKey: string;
  label: string;
  operation: string;
  coinPriceSubunits: number | null;
  isActive: boolean;
  version: number;
  updatedAt: string | null;
}

function PriceCell({ row, onDone, onError }: { row: ToolPriceRow; onDone: (m: string) => void; onError: (m: string) => void }) {
  const qc = useQueryClient();
  const initialCoins = row.coinPriceSubunits != null ? (row.coinPriceSubunits / 100).toString() : "";
  const [draft, setDraft] = useState(initialCoins);
  const [activeDraft, setActiveDraft] = useState(row.isActive);
  const dirty = draft !== initialCoins || activeDraft !== row.isActive;

  const m = useMutation({
    mutationFn: () =>
      panelSend("PUT", `/tool-pricing/${row.toolKey}`, {
        coinPriceSubunits: Math.round(Number(draft) * 100),
        isActive: activeDraft,
      }),
    onSuccess: () => {
      onDone(`${row.label}: ${activeDraft ? `${draft} coin(s), live` : "saved, not yet active"}.`);
      qc.invalidateQueries({ queryKey: ["admin-panel", "/tool-pricing"] });
    },
    onError: (e) => onError(errorMessage(e)),
  });

  const parsed = Number(draft);
  const invalid = !draft.trim() || !Number.isFinite(parsed) || parsed <= 0;
  const activating = activeDraft && !row.isActive;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0.01}
        step={0.01}
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="coins"
        aria-label={`${row.label} price in coins`}
        aria-invalid={invalid}
        className={`w-24 rounded-md border px-2 py-1 text-sm ${invalid ? "border-red-500" : "border-[#301607]/25"}`}
      />
      <label className="flex items-center gap-1.5 text-xs">
        <input type="checkbox" checked={activeDraft} onChange={(e) => setActiveDraft(e.target.checked)} />
        Active
      </label>
      <button
        type="button"
        disabled={!dirty || invalid || m.isPending}
        onClick={() => {
          if (activating && !window.confirm(`Activate "${row.label}" at ${draft} coin(s)? Users will start being charged immediately.`)) return;
          m.mutate();
        }}
        className="rounded-md bg-[#803003] px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
      >
        {m.isPending ? "…" : "Save"}
      </button>
    </div>
  );
}

export default function ToolPricingPage() {
  const q = usePanel<ToolPriceRow[]>("/tool-pricing");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (m: string) => setMsg({ ok: true, text: m });
  const fail = (m: string) => setMsg({ ok: false, text: m });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Premium AI Tool Pricing"
        subtitle="1 coin = ₹1. A tool is never billed to users until you switch it Active here — inactive tools stay free/unmetered exactly as today."
      />
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}
      <QueryView q={q}>
        {(rows) => (
          <Table head={["Feature", "Operation", "Price (coins)", "Status", "Version", "Last updated"]}>
            {rows.map((row) => (
              <tr key={row.toolKey}>
                <td className="px-3 py-2"><p className="font-medium">{row.label}</p><p className="font-mono text-xs text-[#6B6259]">{row.toolKey}</p></td>
                <td className="px-3 py-2 text-sm">{row.operation}</td>
                <td className="px-3 py-2"><PriceCell row={row} onDone={done} onError={fail} /></td>
                <td className="px-3 py-2">{row.isActive ? <Badge tone="good">Active — billed</Badge> : <Badge>Inactive</Badge>}</td>
                <td className="px-3 py-2 text-xs">{row.version || "—"}</td>
                <td className="px-3 py-2 text-xs">{fmtDate(row.updatedAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </QueryView>
    </div>
  );
}
