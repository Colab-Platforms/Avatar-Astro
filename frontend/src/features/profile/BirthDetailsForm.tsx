import { useMemo, useState } from "react";
import LocationPicker from "@/features/ratna/LocationPicker";
import type { PlaceResult } from "@/features/ratna/types";
import { LOCALES } from "@/i18n/languages";
import { btn, ErrorBox, field, labelCls } from "@/features/dashboard/library/ui";
import { useUserProfile } from "./useUserProfile";
import { fromPlaceResult, samePlace, toPlaceResult, type CentralProfile } from "./profile";
import type { BirthPatch } from "./api";

const today = () => new Date().toISOString().slice(0, 10);
type Msg = { ok: boolean; text: string } | null;

/**
 * Where a user views and corrects their saved birth details (and preferred language).
 * Every feature reads this one copy, so a correction here applies everywhere from the next calculation on.
 * Nothing is saved until "Save birth details" is pressed, and only fields that changed are sent.
 */
export default function BirthDetailsForm() {
  const { profile, isLoading, error, save, isSaving, refetch } = useUserProfile();
  const [msg, setMsg] = useState<Msg>(null);

  if (isLoading) return <p role="status" className="text-sm text-[#6E5D4E]">Loading your birth details…</p>;
  if (error || !profile) {
    return <ErrorBox error={error ?? new Error("Your birth details are not available right now.")} onRetry={() => void refetch()} />;
  }
  // Keyed on the save time: after a save the editor restarts from what the server now holds.
  return <Editor key={profile.birthDetailsUpdatedAt ?? "unsaved"} profile={profile} save={save} isSaving={isSaving} msg={msg} setMsg={setMsg} />;
}

function Editor({ profile, save, isSaving, msg, setMsg }: { profile: CentralProfile; save: (p: { birth: BirthPatch }) => Promise<unknown>; isSaving: boolean; msg: Msg; setMsg: (m: Msg) => void }) {
  // Starts from the saved values (the place picker only reads its initial value when it first appears).
  const [dob, setDob] = useState(profile.dateOfBirth ?? "");
  const [time, setTime] = useState(profile.birthTime ?? "");
  const [timeUnknown, setTimeUnknown] = useState(profile.birthTimeUnknown);
  const [place, setPlace] = useState<PlaceResult | null>(() => toPlaceResult(profile.birthPlace));
  const [language, setLanguage] = useState(profile.preferredLanguage ?? "");

  // Only what differs from the saved copy. A cleared picker is not a "remove my birthplace" request.
  const patch = useMemo<BirthPatch>(() => {
    const p: BirthPatch = {};
    if (dob && dob !== (profile.dateOfBirth ?? "")) p.dateOfBirth = dob;
    if (timeUnknown !== profile.birthTimeUnknown || (!timeUnknown && time !== (profile.birthTime ?? ""))) {
      if (timeUnknown) { p.birthTimeUnknown = true; p.birthTime = null; }
      else if (time) { p.birthTimeUnknown = false; p.birthTime = time; }
    }
    if (place && !samePlace(profile.birthPlace, fromPlaceResult(place))) p.birthPlace = fromPlaceResult(place);
    if (language !== (profile.preferredLanguage ?? "")) p.preferredLanguage = language || null;
    return p;
  }, [profile, dob, time, timeUnknown, place, language]);
  const dirty = Object.keys(patch).length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (dob && dob > today()) return setMsg({ ok: false, text: "Date of birth cannot be in the future." });
    if (dob && Number(dob.slice(0, 4)) < 1900) return setMsg({ ok: false, text: "Date of birth cannot be before 1900." });
    try {
      await save({ birth: patch });
      setMsg({ ok: true, text: "Birth details saved. Your next readings will use them." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save your birth details." });
    }
  };

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit} noValidate aria-label="Birth details">
      <label className={`${labelCls} block`}>
        Date of birth
        <input type="date" className={`${field} mt-1.5`} value={dob} min="1900-01-01" max={today()} onChange={(e) => setDob(e.target.value)} />
      </label>

      <div>
        <label className={`${labelCls} block`} htmlFor="birth-time">Exact birth time</label>
        <input id="birth-time" type="time" className={`${field} mt-1.5`} value={timeUnknown ? "" : time} disabled={timeUnknown} onChange={(e) => setTime(e.target.value)} />
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#4A3A2C]">
          <input type="checkbox" className="h-4 w-4 accent-[#592209]" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
          I don't know my exact birth time
        </label>
      </div>

      <div className="sm:col-span-2">
        <span className={`${labelCls} block`}>Birthplace</span>
        <div className="mt-1.5">
          <LocationPicker value={place} onSelect={setPlace} />
        </div>
        <p className="mt-1.5 text-xs text-[#6E5D4E]">This is where you were born, not where you live now. Pick it from the suggestions so the exact coordinates and time zone are saved.</p>
      </div>

      <label className={`${labelCls} block`}>
        Preferred language
        <select className={`${field} mt-1.5`} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">No preference</option>
          {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.native} ({l.english})</option>)}
        </select>
      </label>

      <p className="self-end text-xs leading-relaxed text-[#6E5D4E] sm:col-span-2">
        Your birth details are private. They are used only to personalise your readings, so you don't have to type them again, and are never shown to other users. Correct them here at any time.
      </p>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-xl border px-4 py-3 text-sm sm:col-span-2 ${msg.ok ? "border-[#CFE0C7] bg-[#EEF5EA] text-[#2F4D2D]" : "border-red-200 bg-red-50 text-red-900"}`}>{msg.text}</p>}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className={btn} disabled={isSaving || !dirty}>{isSaving ? "Saving…" : "Save birth details"}</button>
        {dirty && !isSaving && <span className="text-xs text-[#6E5D4E]">You have unsaved changes.</span>}
      </div>
    </form>
  );
}
