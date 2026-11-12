import { useState } from "react";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import LocationPicker from "@/features/ratna/LocationPicker";
import type { PlaceResult } from "@/features/ratna/types";
import { addDays, addMonths, daysBetween, todayAt } from "./format";
import type { EventCard } from "./events";
import type { Direction, MuhuratSearchRequest, TimeOfDay } from "./types";

export type RangePreset = "30d" | "3m" | "6m" | "custom";

export interface MuhuratFormValues {
  place: PlaceResult;
  startDate: string;
  endDate: string;
  preferences: NonNullable<MuhuratSearchRequest["preferences"]>;
}

const input = "w-full rounded-xl border border-[#592209]/25 bg-[#FBF5EC] px-4 py-3 text-base text-[#301607] outline-none focus:border-[#592209]";
const label = "mb-2 block text-[15px] font-bold text-[#592209]";
const chip = (active: boolean) => `flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[15px] ${active ? "border-[#592209] bg-[#592209]/10 font-semibold text-[#301607]" : "border-[#592209]/20 text-[#4A2E1F]"}`;

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "30d", label: "muhurat.form.next30" },
  { id: "3m", label: "muhurat.form.next3m" },
  { id: "6m", label: "muhurat.form.next6m" },
  { id: "custom", label: "muhurat.form.custom" },
];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DIRECTIONS: Direction[] = ["North", "East", "South", "West"];

/** The dates a preset means, counted from today AT THE EVENT PLACE (not the viewer's zone). */
export const presetRange = (preset: Exclude<RangePreset, "custom">, timezone: string, now: Date = new Date()): { startDate: string; endDate: string } => {
  const startDate = todayAt(timezone, now);
  const endDate = preset === "30d" ? addDays(startDate, 29) : addDays(addMonths(startDate, preset === "3m" ? 3 : 6), -1);
  return { startDate, endDate };
};

export function validateRange(startDate: string, endDate: string, today: string): string | null {
  if (!startDate || !endDate) return i18n.t("muhurat.form.errBoth");
  if (endDate < startDate) return i18n.t("muhurat.form.errOrder");
  if (startDate < today) return i18n.t("muhurat.form.errPast");
  if (daysBetween(startDate, endDate) + 1 > 366) return i18n.t("muhurat.form.errLong");
  return null;
}

export default function MuhuratForm({ event, onBack, onSubmit, busy, serverError }: { event: EventCard; onBack: () => void; onSubmit: (v: MuhuratFormValues) => void; busy: boolean; serverError?: string }) {
  const { t } = useTranslation();
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [preset, setPreset] = useState<RangePreset>("3m");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("any");
  const [direction, setDirection] = useState<Direction | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = todayAt(place?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!place) e.place = i18n.t("muhurat.form.errPlace");
    const range = preset === "custom" ? { startDate, endDate } : place ? presetRange(preset, place.timezone) : { startDate: "", endDate: "" };
    if (place) { const r = validateRange(range.startDate, range.endDate, todayAt(place.timezone)); if (r) e.range = r; }
    setErrors(e);
    if (Object.keys(e).length || !place) return;
    onSubmit({
      place, ...range,
      preferences: { weekdays: weekdays.length ? weekdays : undefined, timeOfDay, direction: event.id === "travel" && direction ? direction : undefined },
    });
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-1.5 text-sm text-[#9B2C1D]">⚠ {errors[k]}</p>;

  return (
    <form id="muhurat-form" onSubmit={submit} noValidate className="mx-auto max-w-3xl rounded-3xl border border-[#592209]/20 bg-[#592209]/5 p-5 sm:p-8">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#592209] hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> {t("muhurat.form.changeEvent")}
      </button>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#592209] text-[#F7DC8A]"><event.Icon size={24} aria-hidden="true" /></span>
        <h2 data-testid="form-event" className="text-2xl font-bold uppercase tracking-wide text-[#301607]">{t(`muhurat.events.${event.id}.label`, { defaultValue: event.label })}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm italic text-[#6B4A37]">{t("muhurat.form.intro")}</p>
      </div>

      {serverError && <div role="alert" className="mb-4 rounded-xl border border-[#9B2C1D]/30 bg-[#9B2C1D]/5 px-4 py-3 text-center text-sm text-[#9B2C1D]">⚠ {serverError}</div>}

      <fieldset className="mb-6">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A1E]">{t("muhurat.form.whereLegend")}</legend>
        <span className={label}>{t("muhurat.form.eventLocation")} *</span>
        <LocationPicker value={place} onSelect={setPlace} error={errors.place} />
        {err("place")}
        {place ? (
          <dl data-testid="place-details" className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-[#592209]/15 bg-white/50 p-3 text-sm text-[#4A2E1F] sm:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.city")}</dt><dd>{place.name}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.state")}</dt><dd>{place.admin1 ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.country")}</dt><dd>{place.country ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.latitude")}</dt><dd>{place.latitude.toFixed(4)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.longitude")}</dt><dd>{place.longitude.toFixed(4)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.timeZone")}</dt><dd>{place.timezone}</dd></div>
          </dl>
        ) : (
          <p className="mt-1.5 text-xs text-[#6B4A37]">{t("muhurat.form.placeHelp")}</p>
        )}
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A1E]">{t("muhurat.form.whenLegend")}</legend>
        <div role="radiogroup" aria-label={t("muhurat.form.dateRange")} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <label key={p.id} className={chip(preset === p.id)}>
              <input type="radio" name="muhurat-range" value={p.id} checked={preset === p.id} onChange={() => setPreset(p.id)} className="h-4 w-4 accent-[#592209]" />
              {t(p.label)}
            </label>
          ))}
        </div>
        {preset === "custom" && (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="muhurat-start" className={label}>{t("muhurat.form.startDate")} *</label>
              <input id="muhurat-start" type="date" min={today} className={input} value={startDate} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label htmlFor="muhurat-end" className={label}>{t("muhurat.form.endDate")} *</label>
              <input id="muhurat-end" type="date" min={startDate || today} className={input} value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        )}
        {err("range")}
        <p className="mt-2 text-xs text-[#6B4A37]">{t("muhurat.form.datesNote")}</p>
      </fieldset>

      <details className="mb-6 rounded-xl border border-[#592209]/20 bg-white/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#592209]">{t("muhurat.form.preferences")} <span className="font-normal opacity-60">({t("common.optional")})</span></summary>
        <div className="mt-4 space-y-5">
          <div>
            <span className={label}>{t("muhurat.form.preferredWeekdays")}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("muhurat.form.preferredWeekdays")}>
              {WEEKDAY_KEYS.map((d, i) => (
                <label key={d} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm ${weekdays.includes(i) ? "border-[#592209] bg-[#592209] text-[#F7DC8A]" : "border-[#592209]/25 text-[#592209]"}`}>
                  <input type="checkbox" className="sr-only" checked={weekdays.includes(i)} onChange={() => setWeekdays((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))} />
                  {t(`muhurat.weekdayShort.${d}`)}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[#6B4A37]">{t("muhurat.form.weekdaysNote")}</p>
          </div>
          <div>
            <label htmlFor="muhurat-tod" className={label}>{t("muhurat.form.timeOfDay")}</label>
            <select id="muhurat-tod" className={input} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
              <option value="any">{t("muhurat.form.todAny")}</option>
              <option value="morning">{t("muhurat.form.todMorning")}</option>
              <option value="afternoon">{t("muhurat.form.todAfternoon")}</option>
            </select>
          </div>
          {event.id === "travel" && (
            <div>
              <label htmlFor="muhurat-dir" className={label}>{t("muhurat.form.direction")}</label>
              <select id="muhurat-dir" className={input} value={direction} onChange={(e) => setDirection(e.target.value as Direction | "")}>
                <option value="">{t("muhurat.form.notSpecified")}</option>
                {DIRECTIONS.map((d) => <option key={d} value={d}>{t(`muhurat.direction.${d}`)}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-[#6B4A37]">{t("muhurat.form.directionNote")}</p>
            </div>
          )}
        </div>
      </details>

      <button type="submit" disabled={busy} className="w-full rounded-full bg-[#592209] px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F7DC8A] transition-opacity hover:opacity-90 disabled:opacity-60">
        {busy ? t("common.calculating") : `✦ ${t("muhurat.form.submit")}`}
      </button>
    </form>
  );
}
