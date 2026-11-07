import { useState } from "react";
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
  { id: "30d", label: "Next 30 days" },
  { id: "3m", label: "Next 3 months" },
  { id: "6m", label: "Next 6 months" },
  { id: "custom", label: "Custom dates" },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DIRECTIONS: Direction[] = ["North", "East", "South", "West"];

/** The dates a preset means, counted from today AT THE EVENT PLACE (not the viewer's zone). */
export const presetRange = (preset: Exclude<RangePreset, "custom">, timezone: string, now: Date = new Date()): { startDate: string; endDate: string } => {
  const startDate = todayAt(timezone, now);
  const endDate = preset === "30d" ? addDays(startDate, 29) : addDays(addMonths(startDate, preset === "3m" ? 3 : 6), -1);
  return { startDate, endDate };
};

export function validateRange(startDate: string, endDate: string, today: string): string | null {
  if (!startDate || !endDate) return "Please choose both a start and an end date.";
  if (endDate < startDate) return "The end date must be on or after the start date.";
  if (startDate < today) return "The start date cannot be in the past at the event location.";
  if (daysBetween(startDate, endDate) + 1 > 366) return "Please search at most 366 days at a time.";
  return null;
}

export default function MuhuratForm({ event, onBack, onSubmit, busy, serverError }: { event: EventCard; onBack: () => void; onSubmit: (v: MuhuratFormValues) => void; busy: boolean; serverError?: string }) {
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
    if (!place) e.place = "Please choose the event location from the search results.";
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
        <ArrowLeft size={16} aria-hidden="true" /> Change event
      </button>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#592209] text-[#F7DC8A]"><event.Icon size={24} aria-hidden="true" /></span>
        <h2 data-testid="form-event" className="text-2xl font-bold uppercase tracking-wide text-[#301607]">{event.label}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm italic text-[#6B4A37]">Tell us where the event will take place and when you would like to search. No birth details are needed.</p>
      </div>

      {serverError && <div role="alert" className="mb-4 rounded-xl border border-[#9B2C1D]/30 bg-[#9B2C1D]/5 px-4 py-3 text-center text-sm text-[#9B2C1D]">⚠ {serverError}</div>}

      <fieldset className="mb-6">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A1E]">Where will it take place?</legend>
        <span className={label}>Event location *</span>
        <LocationPicker value={place} onSelect={setPlace} error={errors.place} />
        {err("place")}
        {place ? (
          <dl data-testid="place-details" className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-[#592209]/15 bg-white/50 p-3 text-sm text-[#4A2E1F] sm:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">City</dt><dd>{place.name}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">State</dt><dd>{place.admin1 ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">Country</dt><dd>{place.country ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">Latitude</dt><dd>{place.latitude.toFixed(4)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">Longitude</dt><dd>{place.longitude.toFixed(4)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[#8A5A1E]">Time zone</dt><dd>{place.timezone}</dd></div>
          </dl>
        ) : (
          <p className="mt-1.5 text-xs text-[#6B4A37]">Search for the city, then pick it from the list. Sunrise, sunset and all timings are calculated for that place, not for where you are now.</p>
        )}
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A1E]">When should we look?</legend>
        <div role="radiogroup" aria-label="Date range" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <label key={p.id} className={chip(preset === p.id)}>
              <input type="radio" name="muhurat-range" value={p.id} checked={preset === p.id} onChange={() => setPreset(p.id)} className="h-4 w-4 accent-[#592209]" />
              {p.label}
            </label>
          ))}
        </div>
        {preset === "custom" && (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="muhurat-start" className={label}>Start date *</label>
              <input id="muhurat-start" type="date" min={today} className={input} value={startDate} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label htmlFor="muhurat-end" className={label}>End date *</label>
              <input id="muhurat-end" type="date" min={startDate || today} className={input} value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        )}
        {err("range")}
        <p className="mt-2 text-xs text-[#6B4A37]">Dates are counted in the event location's time zone. You can search up to 366 days at a time.</p>
      </fieldset>

      <details className="mb-6 rounded-xl border border-[#592209]/20 bg-white/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#592209]">Preferences <span className="font-normal opacity-60">(Optional)</span></summary>
        <div className="mt-4 space-y-5">
          <div>
            <span className={label}>Preferred weekdays</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Preferred weekdays">
              {WEEKDAYS.map((d, i) => (
                <label key={d} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm ${weekdays.includes(i) ? "border-[#592209] bg-[#592209] text-[#F7DC8A]" : "border-[#592209]/25 text-[#592209]"}`}>
                  <input type="checkbox" className="sr-only" checked={weekdays.includes(i)} onChange={() => setWeekdays((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))} />
                  {d}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[#6B4A37]">Only weekdays this event's tradition already accepts can be returned.</p>
          </div>
          <div>
            <label htmlFor="muhurat-tod" className={label}>Time of day</label>
            <select id="muhurat-tod" className={input} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
              <option value="any">Any time between sunrise and sunset</option>
              <option value="morning">Morning (until 12:00)</option>
              <option value="afternoon">Afternoon (12:00 until sunset)</option>
            </select>
          </div>
          {event.id === "travel" && (
            <div>
              <label htmlFor="muhurat-dir" className={label}>Direction of travel</label>
              <select id="muhurat-dir" className={input} value={direction} onChange={(e) => setDirection(e.target.value as Direction | "")}>
                <option value="">Not specified</option>
                {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-[#6B4A37]">If given, the weekday on which that direction is unfavourable (Dishashool) is left out.</p>
            </div>
          )}
        </div>
      </details>

      <button type="submit" disabled={busy} className="w-full rounded-full bg-[#592209] px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F7DC8A] transition-opacity hover:opacity-90 disabled:opacity-60">
        {busy ? "Calculating…" : "✦ Find Muhurat"}
      </button>
    </form>
  );
}
