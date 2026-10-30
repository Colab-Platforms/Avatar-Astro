import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { panelSend, usePanel, errorMessage } from "../api";
import { safeHref } from "@/lib/publicContent";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, Field, fmtDate, ghostBtn, inputClass, PageHeader, primaryBtn, Table } from "../ui";

const TYPES = ["BANNER", "ANNOUNCEMENT", "FAQ", "ARTICLE"] as const;
type CType = (typeof TYPES)[number];

interface Item {
  id: string; type: CType; status: "DRAFT" | "PUBLISHED"; title: string; body: string; linkUrl: string | null; imageUrl: string | null;
  sortOrder: number; startsAt: string | null; endsAt: string | null; publishedAt: string | null; createdAt: string;
}
interface Form { id?: string; type: CType; title: string; body: string; linkUrl: string; imageUrl: string; sortOrder: string; startsAt: string; endsAt: string; status: "DRAFT" | "PUBLISHED" }

interface PreviewData { type: CType; title: string; body: string; linkUrl: string; imageUrl: string; status: "DRAFT" | "PUBLISHED" }

/** Shows a draft the way visitors will see it, without publishing. Text only; links must pass the same safety check as the public site. */
function PreviewCard({ data, onClose }: { data: PreviewData; onClose: () => void }) {
  const href = safeHref(data.linkUrl.trim() || null);
  const img = safeHref(data.imageUrl.trim() || null);
  const unsafeLink = data.linkUrl.trim() !== "" && !href;
  const unsafeImg = data.imageUrl.trim() !== "" && !img;
  return (
    <Card
      title="Preview"
      description={data.status === "PUBLISHED" ? "This is how it looks on the public site." : "Draft: visitors cannot see this until you publish it."}
      actions={<button className={ghostBtn} onClick={onClose}>Close preview</button>}
    >
      {(unsafeLink || unsafeImg) && (
        <p role="alert" className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">
          {unsafeLink ? "The link is not allowed (use a path like /blog or an https:// URL) and the server will refuse to save it. " : ""}
          {unsafeImg ? "The image URL is not allowed and will be refused." : ""}
        </p>
      )}
      {data.type === "ANNOUNCEMENT" && (
        <div className="rounded-lg bg-[#803003] px-4 py-2.5 text-center text-sm text-white">
          <strong>{data.title || "(no title)"}</strong>{data.body && <span className="ml-2 opacity-90">{data.body}</span>}
          {href && <span className="ml-2 underline">(links to {href})</span>}
        </div>
      )}
      {data.type === "FAQ" && (
        <div className="rounded-2xl border border-[#E8E3DC] bg-white px-5 py-4">
          <p className="font-semibold text-[#1F1B16]">{data.title || "(no question)"}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-[#4A423A]">{data.body || "(no answer yet)"}</p>
        </div>
      )}
      {(data.type === "BANNER" || data.type === "ARTICLE") && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white sm:flex-row">
          {img && <img src={img} alt="" referrerPolicy="no-referrer" className="h-40 w-full object-cover sm:h-auto sm:w-2/5" />}
          <div className="flex-1 p-5">
            <h4 className="text-xl font-semibold text-[#1F1B16]">{data.title || "(no title)"}</h4>
            <p className="mt-2 whitespace-pre-line text-sm text-[#4A423A]">{data.body}</p>
            {href && <p className="mt-3 text-sm font-semibold text-[#803003]">{data.type === "BANNER" ? "Learn more →" : "Open →"} ({href})</p>}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-[#6B6259]">
        {data.type === "BANNER" ? "Banners appear on the home page below the hero." : data.type === "ARTICLE" ? "Articles appear at the top of the Blog page." : data.type === "FAQ" ? "FAQs are added to the Home FAQ list and the /faq page." : "Announcements appear as a bar at the bottom of every public page."}
      </p>
    </Card>
  );
}

const blank: Form = { type: "ANNOUNCEMENT", title: "", body: "", linkUrl: "", imageUrl: "", sortOrder: "0", startsAt: "", endsAt: "", status: "DRAFT" };
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default function ContentPage() {
  const [filter, setFilter] = useState<"ALL" | CType>("ALL");
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const qc = useQueryClient();
  const q = usePanel<{ items: Item[] }>(`/content${filter === "ALL" ? "" : `?type=${filter}`}`);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-panel"] });
  const fail = (e: unknown) => setMsg({ ok: false, text: errorMessage(e) });

  const save = useMutation({
    mutationFn: (f: Form) => {
      const body = {
        type: f.type, title: f.title, body: f.body, status: f.status,
        linkUrl: f.linkUrl.trim() || null, imageUrl: f.imageUrl.trim() || null,
        sortOrder: Number(f.sortOrder) || 0,
        startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
        endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
      };
      return f.id ? panelSend("PUT", `/content/${f.id}`, body) : panelSend("POST", "/content", body);
    },
    onSuccess: () => { setMsg({ ok: true, text: "Saved." }); setForm(null); refresh(); },
    onError: fail,
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: "DRAFT" | "PUBLISHED" }) => panelSend("PUT", `/content/${v.id}`, { status: v.status }),
    onSuccess: (_d, v) => { setMsg({ ok: true, text: v.status === "PUBLISHED" ? "Published. It is now visible on the site." : "Moved back to draft." }); refresh(); },
    onError: fail,
  });
  const del = useMutation({
    mutationFn: (id: string) => panelSend("DELETE", `/content/${id}`),
    onSuccess: () => { setMsg({ ok: true, text: "Deleted." }); refresh(); },
    onError: fail,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Content & Banners"
        subtitle="Announcements show as a bar at the top of the public site; FAQs are added to the Home FAQ list. Banners and articles are stored and served by the API (/api/public/content) but the site does not render them yet."
        actions={<button className={primaryBtn} onClick={() => setForm({ ...blank })}>New item</button>}
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Content type">
        {(["ALL", ...TYPES] as const).map((t) => (
          <button key={t} role="tab" aria-selected={filter === t} onClick={() => setFilter(t)} className={`${ghostBtn} ${filter === t ? "!bg-[#803003] !text-white" : ""}`}>{t === "ALL" ? "All" : t[0] + t.slice(1).toLowerCase()}</button>
        ))}
      </div>
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}

      {preview && <PreviewCard data={preview} onClose={() => setPreview(null)} />}

      {form && (
        <Card title={form.id ? "Edit item" : "New item"}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); setMsg(null); save.mutate(form); }}
          >
            <Field label="Type" htmlFor="c-type">
              <select id="c-type" className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CType })}>
                {TYPES.map((t) => <option key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</option>)}
              </select>
            </Field>
            <Field label="Status" htmlFor="c-status" hint="Only Published items are public.">
              <select id="c-status" className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })}>
                <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option>
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label={form.type === "FAQ" ? "Question" : "Title"} htmlFor="c-title"><input id="c-title" required minLength={2} maxLength={200} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label={form.type === "FAQ" ? "Answer" : "Text"} htmlFor="c-body" hint="Plain text only; HTML is shown as typed."><textarea id="c-body" rows={4} maxLength={20000} required={form.type === "FAQ"} className={inputClass} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field></div>
            <Field label="Link (optional)" htmlFor="c-link" hint="A path like /blog or an https:// URL."><input id="c-link" className={inputClass} value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></Field>
            <Field label="Image URL (optional)" htmlFor="c-img"><input id="c-img" className={inputClass} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field>
            <Field label="Show from (optional)" htmlFor="c-start"><input id="c-start" type="datetime-local" className={inputClass} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
            <Field label="Show until (optional)" htmlFor="c-end"><input id="c-end" type="datetime-local" className={inputClass} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
            <Field label="Order" htmlFor="c-order" hint="Lower numbers appear first."><input id="c-order" type="number" className={inputClass} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button className={primaryBtn} type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</button>
              <button className={ghostBtn} type="button" onClick={() => setPreview({ type: form.type, title: form.title, body: form.body, linkUrl: form.linkUrl, imageUrl: form.imageUrl, status: form.status })}>Preview</button>
              <button className={ghostBtn} type="button" onClick={() => setForm(null)}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <QueryView q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title="Nothing here yet" hint="Create an announcement or FAQ and publish it to show it on the site." />
          ) : (
            <Table head={["Title", "Type", "Status", "Schedule", "Updated", ""]}>
              {d.items.map((i) => (
                <tr key={i.id}>
                  <td className="max-w-xs px-3 py-2"><p className="truncate font-medium">{i.title}</p></td>
                  <td className="px-3 py-2"><Badge>{i.type[0] + i.type.slice(1).toLowerCase()}</Badge></td>
                  <td className="px-3 py-2">{i.status === "PUBLISHED" ? <Badge tone="good">Published</Badge> : <Badge tone="warn">Draft</Badge>}</td>
                  <td className="px-3 py-2 text-xs">{i.startsAt || i.endsAt ? `${i.startsAt ? fmtDate(i.startsAt) : "now"} → ${i.endsAt ? fmtDate(i.endsAt) : "no end"}` : "Always"}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(i.publishedAt ?? i.createdAt)}</td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                    <button className={ghostBtn} onClick={() => setPreview({ type: i.type, title: i.title, body: i.body, linkUrl: i.linkUrl ?? "", imageUrl: i.imageUrl ?? "", status: i.status })}>Preview</button>
                    <button className={ghostBtn} onClick={() => setForm({ id: i.id, type: i.type, title: i.title, body: i.body, linkUrl: i.linkUrl ?? "", imageUrl: i.imageUrl ?? "", sortOrder: String(i.sortOrder), startsAt: toLocalInput(i.startsAt), endsAt: toLocalInput(i.endsAt), status: i.status })}>Edit</button>
                    <button className={ghostBtn} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: i.id, status: i.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}>{i.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
                    <button className={ghostBtn} disabled={del.isPending} onClick={() => { if (window.confirm(`Delete "${i.title}"? This cannot be undone.`)) del.mutate(i.id); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </QueryView>
    </div>
  );
}
