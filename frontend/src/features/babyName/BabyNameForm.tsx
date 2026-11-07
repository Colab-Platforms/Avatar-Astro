import { useState } from "react";
import { Baby } from "lucide-react";
import LocationPicker from "@/features/ratna/LocationPicker";
import type { PlaceResult } from "@/features/ratna/types";
import type { NamePreference } from "./types";

export interface BabyNameFormValues {
  preferredName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  timeApproximate: boolean;
  place: PlaceResult;
  preference: NamePreference;
}

const PREFS: { value: NamePreference; label: string }[] = [
  { value: "boy", label: "Baby Boy" },
  { value: "girl", label: "Baby Girl" },
  { value: "neutral", label: "Gender-neutral names" },
  { value: "all", label: "Show all" },
];

const input = "w-full rounded-xl border border-[#592209]/25 bg-[#FBF5EC] px-4 py-3 text-base text-[#301607] outline-none focus:border-[#592209]";
const label = "mb-2 block text-[15px] font-bold text-[#592209]";
const NAME_RE = /^[A-Za-z][A-Za-z .'’-]{1,59}$/;

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Every required field is validated here; nothing is assumed (no default time, no default place). */
export function validateBabyForm(v: { preferredName: string; dateOfBirth: string; timeOfBirth: string; place: PlaceResult | null }, today = todayIso()): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.preferredName.trim() && !NAME_RE.test(v.preferredName.trim())) e.preferredName = "Please use English letters, spaces, hyphens or apostrophes (2 to 60 characters).";
  if (!v.dateOfBirth) e.dateOfBirth = "Please enter the baby's date of birth.";
  else if (v.dateOfBirth > today) e.dateOfBirth = "The date of birth cannot be in the future.";
  else if (v.dateOfBirth < "1900-01-01") e.dateOfBirth = "Please enter a date from 1900 onwards.";
  if (!v.timeOfBirth) e.timeOfBirth = "Please enter the exact time of birth. The naming syllable depends on it.";
  if (!v.place) e.place = "Please choose the birthplace from the suggestions. Its coordinates and time zone are needed for the calculation.";
  return e;
}

export default function BabyNameForm({ onSubmit, busy, serverError }: { onSubmit: (v: BabyNameFormValues) => void; busy: boolean; serverError?: string }) {
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDob] = useState("");
  const [timeOfBirth, setTime] = useState("");
  const [timeApproximate, setApprox] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [preference, setPreference] = useState<NamePreference>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateBabyForm({ preferredName, dateOfBirth, timeOfBirth, place });
    setErrors(e);
    if (Object.keys(e).length || !place) return;
    onSubmit({ preferredName: preferredName.trim(), dateOfBirth, timeOfBirth, timeApproximate, place, preference });
  };

  const err = (k: string) => errors[k] && <p role="alert" id={`baby-${k}-err`} className="mt-1.5 text-sm text-[#9B2C1D]">⚠ {errors[k]}</p>;

  return (
    <form id="baby-form" onSubmit={submit} noValidate className="mx-auto max-w-3xl rounded-3xl border border-[#592209]/20 bg-[#592209]/5 p-5 sm:p-8">
      <div className="mb-5 text-center">
        <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#592209] text-[#F7DC8A]"><Baby size={24} aria-hidden="true" /></span>
        <h2 className="text-2xl font-bold uppercase tracking-wide text-[#301607]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>Baby&rsquo;s Details</h2>
      </div>

      {serverError && <div role="alert" className="mb-4 rounded-xl border border-[#9B2C1D]/30 bg-[#9B2C1D]/5 px-4 py-3 text-center text-sm text-[#9B2C1D]">⚠ {serverError}</div>}

      <div className="mb-5">
        <label htmlFor="baby-name" className={label}>Preferred name <span className="font-normal opacity-60">(Optional)</span></label>
        <input id="baby-name" className={input} maxLength={60} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="Only if you already have a name in mind" aria-invalid={!!errors.preferredName} aria-describedby={errors.preferredName ? "baby-preferredName-err" : undefined} autoComplete="off" />
        {err("preferredName")}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="baby-dob" className={label}>Date of Birth *</label>
          <input id="baby-dob" type="date" min="1900-01-01" max={todayIso()} className={input} value={dateOfBirth} onChange={(e) => setDob(e.target.value)} aria-invalid={!!errors.dateOfBirth} aria-describedby={errors.dateOfBirth ? "baby-dateOfBirth-err" : undefined} />
          {err("dateOfBirth")}
        </div>
        <div>
          <label htmlFor="baby-tob" className={label}>Exact Time of Birth *</label>
          <input id="baby-tob" type="time" className={input} value={timeOfBirth} onChange={(e) => setTime(e.target.value)} aria-invalid={!!errors.timeOfBirth} aria-describedby={errors.timeOfBirth ? "baby-timeOfBirth-err" : undefined} />
          {err("timeOfBirth")}
        </div>
      </div>

      <label className="mb-5 flex cursor-pointer items-start gap-2.5 text-sm text-[#4A2E1F]">
        <input type="checkbox" checked={timeApproximate} onChange={(e) => setApprox(e.target.checked)} className="mt-1 h-4 w-4 accent-[#592209]" />
        <span>I am not sure the birth time is exact. We will show every Pada the Moon was in within an hour either side.</span>
      </label>

      <div className="mb-5">
        <span id="baby-place-label" className={label}>Place of Birth *</span>
        <LocationPicker value={place} onSelect={setPlace} error={errors.place} />
        {errors.place && !place && <p role="alert" className="mt-1.5 text-sm text-[#9B2C1D]">⚠ {errors.place}</p>}
      </div>

      <fieldset className="mb-6">
        <legend className={label}>Name preference</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PREFS.map((p) => (
            <label key={p.value} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[15px] ${preference === p.value ? "border-[#592209] bg-[#592209]/10 font-semibold text-[#301607]" : "border-[#592209]/20 text-[#4A2E1F]"}`}>
              <input type="radio" name="baby-pref" value={p.value} checked={preference === p.value} onChange={() => setPreference(p.value)} className="h-4 w-4 accent-[#592209]" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={busy} className="w-full rounded-full bg-[#592209] px-6 py-4 text-base font-extrabold uppercase tracking-wider text-[#F5E9D6] shadow-[0_0_30px_rgba(89,34,9,0.35)] disabled:opacity-60">
        {busy ? "Calculating…" : "✦ Find Auspicious Names ✦"}
      </button>
    </form>
  );
}
