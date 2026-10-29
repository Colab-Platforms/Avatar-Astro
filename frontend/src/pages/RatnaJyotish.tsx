import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RatnaEmblem from "@/features/ratna/RatnaEmblem";
import RatnaLoader from "@/features/ratna/RatnaLoader";
import LocationPicker from "@/features/ratna/LocationPicker";
import { ratnaApi } from "@/features/ratna/api";
import { MIN_LOADER_MS } from "@/features/ratna/loaderTiming";
import { clearResult, saveResult } from "@/features/ratna/storage";
import type { PlaceResult } from "@/features/ratna/types";
import "@/features/ratna/ratna.css";

export const RATNA_TITLE = "Ratna Jyotish";
export const RATNA_SUBTITLE =
  "Discover the gemstone traditionally associated with your birth chart.";
export const RATNA_DESCRIPTION =
  "Explore personalized Vedic astrology interpretations, traditional gemstone significance, customary wearing guidance, and related products from the My Bhagya Shop.";

const today = () => new Date().toISOString().slice(0, 10);

interface Errors {
  date?: string;
  time?: string;
  place?: string;
}

const RatnaJyotish = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const minTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(minTimer.current);
    };
  }, []);

  useEffect(() => {
    document.title = `${RATNA_TITLE} | My Bhagya`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", RATNA_DESCRIPTION);
    return () => {
      if (meta && prev != null) meta.setAttribute("content", prev);
    };
  }, []);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!date) e.date = "Please enter your date of birth.";
    else if (date > today()) e.date = "Date of birth cannot be in the future.";
    else if (Number(date.slice(0, 4)) < 1800) e.date = "Please enter a year from 1800 onwards.";
    if (!timeUnknown && !time) e.time = "Enter your exact birth time, or tick the box if you don't know it.";
    if (!place) e.place = "Please choose your birthplace from the suggestions.";
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (inFlight.current) return; // prevent duplicate submissions
    const e = validate();
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length > 0 || !place) return;

    inFlight.current = true;
    clearResult(); // never show an old result for new inputs
    const startedAt = Date.now();
    setLoading(true);

    // Settle either way so success and failure share the minimum loader time.
    const outcome = await ratnaApi
      .calculate({
        dateOfBirth: date,
        timeOfBirth: timeUnknown ? null : time,
        timeUnknown,
        place: {
          name: place.name,
          admin1: place.admin1,
          country: place.country,
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone,
        },
      })
      .then(
        (result) => ({ kind: "ok" as const, result }),
        (error: unknown) => ({ kind: "error" as const, error }),
      );

    const remaining = MIN_LOADER_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise<void>((resolve) => {
        minTimer.current = setTimeout(resolve, remaining);
      });
    }
    inFlight.current = false;
    if (!mounted.current) return;

    if (outcome.kind === "ok") {
      saveResult(outcome.result);
      navigate("/ratna-jyotish/result", { state: { result: outcome.result } });
    } else {
      setApiError(
        (outcome.error as Error)?.message ||
          "We could not complete the calculation. Please check your details and try again.",
      );
      setLoading(false); // back to the form with inputs preserved
    }
  };

  return (
    <>
      {loading && <RatnaLoader />}
      <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-12 sm:px-6" aria-hidden={loading}>
        <header className="text-center">
          <RatnaEmblem size={84} className="mx-auto h-[64px] w-[64px] sm:h-[84px] sm:w-[84px]" />
          <h1 className="mt-3 font-astra text-4xl text-[#301607] sm:text-5xl">{RATNA_TITLE}</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">{RATNA_SUBTITLE}</p>
          <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground">{RATNA_DESCRIPTION}</p>
        </header>

        <form onSubmit={onSubmit} noValidate className="ratna-card mt-8 p-5 sm:p-7" aria-label="Birth details">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="ratna-dob" className="mb-1.5 block text-base text-[#301607]">
                Date of birth
              </label>
              <input
                id="ratna-dob"
                type="date"
                className="ratna-input"
                value={date}
                max={today()}
                min="1800-01-01"
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? "ratna-dob-err" : undefined}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((p) => ({ ...p, date: undefined }));
                }}
              />
              {errors.date && (
                <p id="ratna-dob-err" role="alert" className="mt-1 text-sm text-red-800">
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="ratna-tob" className="mb-1.5 block text-base text-[#301607]">
                Exact birth time
              </label>
              <input
                id="ratna-tob"
                type="time"
                className="ratna-input"
                value={timeUnknown ? "" : time}
                disabled={timeUnknown}
                aria-invalid={!!errors.time}
                aria-describedby={errors.time ? "ratna-tob-err" : undefined}
                onChange={(e) => {
                  setTime(e.target.value);
                  setErrors((p) => ({ ...p, time: undefined }));
                }}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-base text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#592209]"
                  checked={timeUnknown}
                  onChange={(e) => {
                    setTimeUnknown(e.target.checked);
                    if (e.target.checked) setErrors((p) => ({ ...p, time: undefined }));
                  }}
                />
                I don't know my exact birth time
              </label>
              {errors.time && (
                <p id="ratna-tob-err" role="alert" className="mt-1 text-sm text-red-800">
                  {errors.time}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-base text-[#301607]">Birthplace</label>
            <LocationPicker
              value={place}
              onSelect={(p) => {
                setPlace(p);
                if (p) setErrors((e) => ({ ...e, place: undefined }));
              }}
              error={errors.place}
            />
          </div>

          {apiError && (
            <div role="alert" className="mt-5 rounded-lg border border-red-400/50 bg-red-950/40 p-3 text-red-800">
              {apiError} Your details are still filled in, so you can try again.
            </div>
          )}

          <button type="submit" className="ratna-btn mt-6 w-full" disabled={loading}>
            CALCULATE MY GEMSTONE
          </button>
        </form>
      </section>
    </>
  );
};

export default RatnaJyotish;
