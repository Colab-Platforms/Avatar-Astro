import { useState } from "react";
import { Card, ghostBtn, inputClass, PageHeader, primaryBtn } from "@/features/admin/panel/ui";
import {
  useDocumentRequirementsAdmin, useScanningSetting, useSetScanningSetting, useSpecialtyOptionsAdmin,
  useUpsertDocumentRequirement, useUpsertSpecialtyOption,
  useRateBoundsSetting, useSetRateBoundsSetting,
} from "../hooks/useAdminAstrologers";

export default function AstrologerSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Astrologer settings" subtitle="Document scanning, specialties, rate bounds, and required document types — all configurable without a deploy." />
      <RateBoundsCard />
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

function RateBoundsCard() {
  const bounds = useRateBoundsSetting();
  const setBounds = useSetRateBoundsSetting();
  const [minRate, setMinRate] = useState<string>("");
  const [maxRate, setMaxRate] = useState<string>("");
  const [defaultRate, setDefaultRate] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const startEdit = () => {
    if (bounds.data) {
      setMinRate(String(bounds.data.minRatePerMinuteRupees));
      setMaxRate(String(bounds.data.maxRatePerMinuteRupees));
      setDefaultRate(String(bounds.data.defaultRatePerMinuteRupees));
      setEditing(true);
    }
  };

  const save = () => {
    const min = Number(minRate);
    const max = Number(maxRate);
    const def = Number(defaultRate);
    if (min >= 1 && max >= min && def >= min && def <= max) {
      setBounds.mutate(
        { minRatePerMinuteRupees: min, maxRatePerMinuteRupees: max, defaultRatePerMinuteRupees: def },
        { onSuccess: () => setEditing(false) },
      );
    }
  };

  return (
    <Card
      title="Consultation rate bounds & defaults"
      description="Global price limits (in ₹ per minute) enforced across all astrologer profiles. Astrologers cannot set a rate below the minimum or above the maximum."
    >
      {bounds.data && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-[#6B6259]">Minimum Rate</p>
              <p className="font-semibold text-[#1F1B16]">₹{bounds.data.minRatePerMinuteRupees} / min</p>
            </div>
            <div>
              <p className="text-xs text-[#6B6259]">Maximum Rate</p>
              <p className="font-semibold text-[#1F1B16]">₹{bounds.data.maxRatePerMinuteRupees} / min</p>
            </div>
            <div>
              <p className="text-xs text-[#6B6259]">Default Suggested Rate</p>
              <p className="font-semibold text-[#1F1B16]">₹{bounds.data.defaultRatePerMinuteRupees} / min</p>
            </div>
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="rounded-lg border border-[#DDD6CC] bg-white px-3 py-1.5 text-xs font-semibold text-[#803003] hover:bg-[#F7F4EF]"
          >
            Edit bounds
          </button>
        </div>
      ) : editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#6B6259] mb-1">Minimum Rate (₹/min)</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6259] mb-1">Maximum Rate (₹/min)</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={maxRate}
                onChange={(e) => setMaxRate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6259] mb-1">Default Suggested (₹/min)</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={setBounds.isPending}
              onClick={save}
              className={primaryBtn}
            >
              {setBounds.isPending ? "Saving…" : "Save bounds"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#6B6259]">Loading bounds…</p>
      )}
    </Card>
  );
}
