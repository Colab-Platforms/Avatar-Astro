import { useState } from "react";
import { Card, ghostBtn, inputClass, PageHeader, primaryBtn } from "@/features/admin/panel/ui";
import {
  useDocumentRequirementsAdmin, useScanningSetting, useSetScanningSetting, useSpecialtyOptionsAdmin,
  useUpsertDocumentRequirement, useUpsertSpecialtyOption,
} from "../hooks/useAdminAstrologers";

export default function AstrologerSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Astrologer settings" subtitle="Document scanning, specialties and required document types — all configurable without a deploy." />
      <ScanningToggleCard />
      <SpecialtiesCard />
      <DocumentRequirementsCard />
    </div>
  );
}

function ScanningToggleCard() {
  const setting = useScanningSetting();
  const setScanning = useSetScanningSetting();
  return (
    <Card title="Document malware scanning" description="When off, uploaded documents skip the ClamAV scan entirely and are marked SKIPPED instead of CLEAN.">
      {setting.data && (
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={setting.data.enabled}
            onChange={(e) => setScanning.mutate(e.target.checked)}
            disabled={setScanning.isPending}
          />
          <span className="text-sm text-[#1F1B16]">{setting.data.enabled ? "Scanning is ON" : "Scanning is OFF — uploads are not scanned"}</span>
        </label>
      )}
    </Card>
  );
}

function SpecialtiesCard() {
  const list = useSpecialtyOptionsAdmin();
  const upsert = useUpsertSpecialtyOption();
  const [form, setForm] = useState({ key: "", label: "" });

  return (
    <Card title="Specialty options" description="Shown to applicants in the wizard. Editing here never changes existing applications' saved choices.">
      <ul className="mb-3 space-y-1 text-sm">
        {list.data?.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg border border-[#E8E3DC] px-3 py-1.5">
            <span>{s.label} <span className="text-[#6B6259]">({s.key})</span></span>
            <button className="text-xs text-[#803003] underline" onClick={() => upsert.mutate({ key: s.key, label: s.label, isActive: !s.isActive, sortOrder: s.sortOrder })}>
              {s.isActive ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className={inputClass} placeholder="key (e.g. tarot_reading)" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
        <input className={inputClass} placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
        <button className={primaryBtn} disabled={!form.key || !form.label || upsert.isPending} onClick={() => { upsert.mutate(form); setForm({ key: "", label: "" }); }}>Add</button>
      </div>
    </Card>
  );
}

function DocumentRequirementsCard() {
  const list = useDocumentRequirementsAdmin();
  const upsert = useUpsertDocumentRequirement();
  const [form, setForm] = useState({ key: "", group: "", label: "", category: "SUPPORTING" as "IDENTITY" | "SUPPORTING", isRequired: false });

  return (
    <Card title="Document requirements" description="Editing here only affects applications not yet submitted — submitted applications are judged against the requirements frozen at their submission time.">
      <ul className="mb-3 space-y-1 text-sm">
        {list.data?.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg border border-[#E8E3DC] px-3 py-1.5">
            <span>{r.label} <span className="text-[#6B6259]">({r.group} · {r.category}{r.isRequired ? " · required" : ""})</span></span>
            <button className="text-xs text-[#803003] underline" onClick={() => upsert.mutate({ ...r, isActive: !r.isActive })}>
              {r.isActive ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputClass} placeholder="key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
        <input className={inputClass} placeholder="group (shared slots pick one)" value={form.group} onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))} />
        <input className={inputClass} placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
        <select className={inputClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as "IDENTITY" | "SUPPORTING" }))}>
          <option value="IDENTITY">Identity</option>
          <option value="SUPPORTING">Supporting</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} /> Required</label>
      </div>
      <button
        className={`${ghostBtn} mt-2`}
        disabled={!form.key || !form.group || !form.label || upsert.isPending}
        onClick={() => { upsert.mutate(form); setForm({ key: "", group: "", label: "", category: "SUPPORTING", isRequired: false }); }}
      >
        Add requirement
      </button>
    </Card>
  );
}
