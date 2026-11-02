import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage, panelSend, usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, ghostBtn, inputClass, PageHeader, personName, primaryBtn, Stat } from "../ui";

type Status = "PENDING" | "CONTACTED" | "DISMISSED";

interface Item {
  id: string;
  message: string;
  reason: "PERSONAL_CONTACT" | "IDENTITY_PROBE";
  status: Status;
  adminNote: string | null;
  handledAt: string | null;
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null };
}
interface Data { items: Item[]; counts: Record<Status, number> }

const REASON: Record<Item["reason"], string> = { PERSONAL_CONTACT: "Wants personal contact", IDENTITY_PROBE: "Asked who/what we are" };
const TABS: Status[] = ["PENDING", "CONTACTED", "DISMISSED"];

function Row({ item, onChanged, onMessage }: { item: Item; onChanged: () => void; onMessage: (m: string) => void }) {
  const [note, setNote] = useState(item.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const set = async (status: Status) => {
    setBusy(true);
    try {
      await panelSend("PATCH", `/chat-escalations/${item.id}`, { status, adminNote: note });
      onChanged();
    } catch (e) {
      onMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{personName(item.user)}</p>
          <p className="text-xs text-[#6B6259]">
            <a className="underline" href={`mailto:${item.user.email}`}>{item.user.email}</a>
            {item.user.phoneNo && <> · <a className="underline" href={`tel:${item.user.phoneNo}`}>{item.user.phoneNo}</a></>}
          </p>
        </div>
        <div className="flex items-center gap-2"><Badge tone="warn">{REASON[item.reason]}</Badge><span className="text-xs text-[#6B6259]">{fmtDate(item.createdAt)}</span></div>
      </div>
      <blockquote className="whitespace-pre-wrap rounded-lg bg-[#F7F4EF] px-3 py-2 text-sm">{item.message}</blockquote>
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputClass} max-w-md flex-1`} placeholder="Internal note (optional)" aria-label="Internal note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        {item.status !== "CONTACTED" && <button type="button" className={primaryBtn} disabled={busy} onClick={() => set("CONTACTED")}>Mark contacted</button>}
        {item.status !== "DISMISSED" && <button type="button" className={ghostBtn} disabled={busy} onClick={() => set("DISMISSED")}>Dismiss</button>}
        {item.status !== "PENDING" && <button type="button" className={ghostBtn} disabled={busy} onClick={() => set("PENDING")}>Reopen</button>}
      </div>
      {item.status !== "PENDING" && item.handledAt && <p className="text-xs text-[#6B6259]">{item.status === "CONTACTED" ? "Contacted" : "Dismissed"} {fmtDate(item.handledAt)}</p>}
    </li>
  );
}

export default function ChatEscalationsPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const [msg, setMsg] = useState<string | null>(null);
  const qc = useQueryClient();
  const q = usePanel<Data>(`/chat-escalations?status=${status}`, { refetchInterval: 30_000 });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Chat escalations" subtitle="Messages from the Divya Margdarshak chat that were held back from the guide (personal-contact requests, “are you human?” questions). Contact these users yourself." />
      {msg && <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">{msg}</p>}
      <QueryView q={q}>
        {(d) => (
          <>
            <div className="grid grid-cols-3 gap-3">
              {TABS.map((s) => <Stat key={s} label={s[0] + s.slice(1).toLowerCase()} value={d.counts[s]} tone={s === "PENDING" && d.counts[s] ? "bad" : "default"} />)}
            </div>
            <div className="flex gap-2" role="tablist">
              {TABS.map((s) => (
                <button key={s} role="tab" aria-selected={s === status} type="button" className={s === status ? primaryBtn : ghostBtn} onClick={() => setStatus(s)}>{s[0] + s.slice(1).toLowerCase()}</button>
              ))}
            </div>
            <Card>
              {d.items.length === 0 ? <Empty title="Nothing here" hint={status === "PENDING" ? "No users are waiting to be contacted." : undefined} /> : (
                <ul className="divide-y divide-[#EEE9E2]">
                  {d.items.map((i) => <Row key={`${i.id}-${i.status}`} item={i} onMessage={setMsg} onChanged={() => { setMsg(null); void qc.invalidateQueries({ queryKey: ["admin-panel"] }); }} />)}
                </ul>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </div>
  );
}
