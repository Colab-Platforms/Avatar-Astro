import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Car } from "lucide-react";
import LocationPicker from "@/features/ratna/LocationPicker";
import type { PlaceResult } from "@/features/ratna/types";
import { parseRegistration, SCOPE_LABEL, type Scope } from "./registration";
import { VEHICLE_TYPE_LABEL, type Mode, type VehicleType } from "./types";

export interface VehicleFormValues {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  place: PlaceResult;
  vehicleType: VehicleType;
  mode: Mode;
  scope: Scope;
  existing: string;
  compare: string[];
  preferred: string;
  range: { min: number; max: number } | null;
}

const MODES: { value: Mode; label: string }[] = [
  { value: "find", label: "vehicle.form.modeFind" },
  { value: "check", label: "vehicle.form.modeCheck" },
  { value: "compare", label: "vehicle.form.modeCompare" },
];

const input = "w-full rounded-xl border border-[#592209]/25 bg-[#FBF5EC] px-4 py-3 text-base text-[#301607] outline-none focus:border-[#592209]";
const label = "mb-2 block text-[15px] font-bold text-[#592209]";
const NAME_RE = /^[A-Za-z][A-Za-z .'’-]{1,59}$/;
export const todayIso = () => new Date().toISOString().slice(0, 10);

export interface FormState {
  name: string; dateOfBirth: string; timeOfBirth: string; place: PlaceResult | null; mode: Mode;
  existing: string; compare: string[]; preferred: string; rangeMin: string; rangeMax: string;
}

/** Every required field is validated here; nothing is assumed (no default time, no default place). */
export function validateVehicleForm(v: FormState, today = todayIso()): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.name.trim() && !NAME_RE.test(v.name.trim())) e.name = i18n.t("babyName.error.nameFormat");
  if (!v.dateOfBirth) e.dateOfBirth = i18n.t("vehicle.error.dobMissing");
  else if (v.dateOfBirth > today) e.dateOfBirth = i18n.t("babyName.error.dobFuture");
  else if (v.dateOfBirth < "1900-01-01") e.dateOfBirth = i18n.t("babyName.error.dobOld");
  if (!v.timeOfBirth) e.timeOfBirth = i18n.t("vehicle.error.tobMissing");
  if (!v.place) e.place = i18n.t("vehicle.error.placeMissing");

  if (v.mode === "check") {
    const r = parseRegistration(v.existing);
    if (!r.ok) e.existing = r.error;
  }
  if (v.mode === "compare") {
    const filled = v.compare.map((c) => c.trim()).filter(Boolean);
    const bad = filled.map((c) => parseRegistration(c)).find((r) => !r.ok);
    if (filled.length < 2) e.compare = i18n.t("vehicle.error.compareMin");
    else if (bad && !bad.ok) e.compare = bad.error;
  }
  if (v.preferred.trim()) {
    if (!/^\d{1,4}$/.test(v.preferred.trim()) || Number(v.preferred) === 0) e.preferred = i18n.t("vehicle.error.preferred");
  }
  if (v.rangeMin.trim() || v.rangeMax.trim()) {
    const lo = Number(v.rangeMin);
    const hi = Number(v.rangeMax);
    if (!/^\d{1,4}$/.test(v.rangeMin.trim()) || !/^\d{1,4}$/.test(v.rangeMax.trim()) || lo < 1 || hi > 9999) e.range = "Please enter both ends of the range, between 1 and 9999.";
    else if (lo > hi) e.range = "The first number of the range must not be larger than the second.";
  }
  return e;
}

export default function VehicleForm({ onSubmit, busy, serverError }: { onSubmit: (v: VehicleFormValues) => void; busy: boolean; serverError?: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [dateOfBirth, setDob] = useState("");
  const [timeOfBirth, setTime] = useState("");
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>("four-wheeler");
  const [mode, setMode] = useState<Mode>("find");
  const [scope, setScope] = useState<Scope>("number");
  const [existing, setExisting] = useState("");
  const [compare, setCompare] = useState<string[]>(["", "", ""]);
  const [preferred, setPreferred] = useState("");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateVehicleForm({ name, dateOfBirth, timeOfBirth, place, mode, existing, compare, preferred, rangeMin, rangeMax });
    setErrors(e);
    if (Object.keys(e).length || !place) return;
    const hasRange = rangeMin.trim() && rangeMax.trim();
    onSubmit({
      name: name.trim(), dateOfBirth, timeOfBirth, place, vehicleType, mode, scope,
      existing: existing.trim(),
      compare: compare.map((c) => c.trim()).filter(Boolean),
      preferred: preferred.trim() ? preferred.trim().padStart(4, "0") : "",
      range: hasRange ? { min: Number(rangeMin), max: Number(rangeMax) } : null,
    });
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-1.5 text-sm text-[#9B2C1D]">⚠ {errors[k]}</p>;
  const chip = (active: boolean) => `flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[15px] ${active ? "border-[#592209] bg-[#592209]/10 font-semibold text-[#301607]" : "border-[#592209]/20 text-[#4A2E1F]"}`;

  return (
    <form id="vehicle-form" onSubmit={submit} noValidate className="mx-auto max-w-3xl rounded-3xl border border-[#592209]/20 bg-[#592209]/5 p-5 sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#592209] text-[#F7DC8A]"><Car size={24} aria-hidden="true" /></span>
        <h2 className="text-2xl font-bold uppercase tracking-wide text-[#301607]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>{t("vehicle.form.title")}</h2>
      </div>

      {serverError && <div role="alert" className="mb-4 rounded-xl border border-[#9B2C1D]/30 bg-[#9B2C1D]/5 px-4 py-3 text-center text-sm text-[#9B2C1D]">⚠ {serverError}</div>}

      <fieldset className="mb-6">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A1E]">{t("vehicle.form.aboutYou")}</legend>
        <div className="mb-5">
          <label htmlFor="veh-name" className={label}>{t("vehicle.form.fullName")} <span className="font-normal opacity-60">({t("common.optional")})</span></label>
          <input id="veh-name" className={input} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("vehicle.form.namePlaceholder")} autoComplete="name" aria-invalid={!!errors.name} />
          {err("name")}
        </div>
        <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="veh-dob" className={label}>{t("common.dateOfBirth")} *</label>
            <input id="veh-dob" type="date" min="1900-01-01" max={todayIso()} className={input} value={dateOfBirth} onChange={(e) => setDob(e.target.value)} aria-invalid={!!errors.dateOfBirth} />
            {err("dateOfBirth")}
          </div>
          <div>
            <label htmlFor="veh-tob" className={label}>{t("babyName.form.exactTime")} *</label>
            <input id="veh-tob" type="time" className={input} value={timeOfBirth} onChange={(e) => setTime(e.target.value)} aria-invalid={!!errors.timeOfBirth} />
            {err("timeOfBirth")}
          </div>
        </div>
        <div>
          <span className={label}>{t("common.placeOfBirth")} *</span>
          <LocationPicker value={place} onSelect={setPlace} error={errors.place} />
          {errors.place && !place && <p role="alert" className="mt-1.5 text-sm text-[#9B2C1D]">⚠ {errors.place}</p>}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A1E]">{t("vehicle.form.yourVehicle")}</legend>
        <div className="mb-5">
          <span className={label}>{t("vehicle.form.vehicleType")}</span>
          <div role="radiogroup" aria-label={t("vehicle.form.vehicleType")} className="grid grid-cols-2 gap-2">
            {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((t) => (
              <label key={t} className={chip(vehicleType === t)}>
                <input type="radio" name="veh-type" value={t} checked={vehicleType === t} onChange={() => setVehicleType(t)} className="h-4 w-4 accent-[#592209]" />
                {VEHICLE_TYPE_LABEL[t]}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[#6B4A37]">{t("vehicle.form.vehicleTypeNote")}</p>
        </div>

        <div className="mb-5">
          <span className={label}>{t("vehicle.form.whatToDo")}</span>
          <div role="radiogroup" aria-label={t("vehicle.form.whatToDo")} className="grid grid-cols-1 gap-2">
            {MODES.map((m) => (
              <label key={m.value} className={chip(mode === m.value)}>
                <input type="radio" name="veh-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="h-4 w-4 accent-[#592209]" />
                {t(m.label)}
              </label>
            ))}
          </div>
        </div>

        {mode === "check" && (
          <div className="mb-5">
            <label htmlFor="veh-existing" className={label}>{t("vehicle.form.existingNumber")} *</label>
            <input id="veh-existing" className={input} maxLength={20} value={existing} onChange={(e) => setExisting(e.target.value)} placeholder={t("vehicle.form.existingPlaceholder")} autoCapitalize="characters" aria-invalid={!!errors.existing} />
            {err("existing")}
          </div>
        )}

        {mode === "compare" && (
          <div className="mb-5">
            <span className={label}>{t("vehicle.form.numbersToCompare")} * <span className="font-normal opacity-60">({t("vehicle.form.twoOrThree")})</span></span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {compare.map((c, i) => (
                <div key={i}>
                  <label htmlFor={`veh-cmp-${i}`} className="sr-only">{t("vehicle.form.numberN", { n: i + 1 })}</label>
                  <input id={`veh-cmp-${i}`} className={input} maxLength={20} value={c} onChange={(e) => setCompare((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))} placeholder={["0007", "0021", "0786"][i]} />
                </div>
              ))}
            </div>
            {err("compare")}
          </div>
        )}

        {mode !== "compare" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="veh-pref" className={label}>{t("vehicle.form.preferredNumber")} <span className="font-normal opacity-60">({t("common.optional")})</span></label>
              <input id="veh-pref" inputMode="numeric" className={input} maxLength={4} value={preferred} onChange={(e) => setPreferred(e.target.value.replace(/\D/g, ""))} placeholder={t("vehicle.form.preferredPlaceholder")} aria-invalid={!!errors.preferred} />
              {err("preferred")}
            </div>
            <div>
              <span className={label}>{t("vehicle.form.preferredRange")} <span className="font-normal opacity-60">({t("common.optional")})</span></span>
              <div className="flex items-center gap-2">
                <label htmlFor="veh-min" className="sr-only">{t("vehicle.form.rangeFrom")}</label>
                <input id="veh-min" inputMode="numeric" className={input} maxLength={4} value={rangeMin} onChange={(e) => setRangeMin(e.target.value.replace(/\D/g, ""))} placeholder="0001" />
                <span aria-hidden="true">{t("vehicle.form.rangeTo")}</span>
                <label htmlFor="veh-max" className="sr-only">{t("vehicle.form.rangeToLabel")}</label>
                <input id="veh-max" inputMode="numeric" className={input} maxLength={4} value={rangeMax} onChange={(e) => setRangeMax(e.target.value.replace(/\D/g, ""))} placeholder="9999" />
              </div>
              {err("range")}
            </div>
          </div>
        )}
      </fieldset>

      <details className="mb-6 rounded-xl border border-[#592209]/20 bg-white/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#592209]">{t("vehicle.form.whichDigits")}</summary>
        <div role="radiogroup" aria-label={t("vehicle.form.digitsToEvaluate")} className="mt-3 grid gap-2">
          {(Object.keys(SCOPE_LABEL) as Scope[]).map((s) => (
            <label key={s} className={chip(scope === s)}>
              <input type="radio" name="veh-scope" value={s} checked={scope === s} onChange={() => setScope(s)} className="h-4 w-4 accent-[#592209]" />
              {SCOPE_LABEL[s]}{s === "number" ? " (default)" : ""}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#6B4A37]">{t("vehicle.form.digitsNote")}</p>
      </details>

      <button type="submit" disabled={busy} className="w-full rounded-full bg-[#592209] px-6 py-4 text-base font-extrabold uppercase tracking-wider text-[#F5E9D6] shadow-[0_0_30px_rgba(89,34,9,0.35)] disabled:opacity-60">
        {busy ? t("common.calculating") : `✦ ${t("vehicle.form.submit")} ✦`}
      </button>
    </form>
  );
}
