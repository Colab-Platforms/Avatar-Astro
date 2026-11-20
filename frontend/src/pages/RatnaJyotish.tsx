import { useEffect, useMemo, useRef, useState } from "react";
import FeatureFaq from "@/components/FeatureFaq";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FEATURES } from "@/data/featureCatalog";
import RatnaEmblem from "@/features/ratna/RatnaEmblem";
import RatnaLoader from "@/features/ratna/RatnaLoader";
import LocationPicker from "@/features/ratna/LocationPicker";
import { ratnaApi } from "@/features/ratna/api";
import { MIN_LOADER_MS } from "@/features/ratna/loaderTiming";
import { requireSignIn } from "@/lib/authedFetch";
import { clearResult, loadDraft, saveDraft, saveResult } from "@/features/ratna/storage";
import type { Gender, PlaceResult } from "@/features/ratna/types";
import { useUserProfile } from "@/features/profile/useUserProfile";
import { SavedProfileCard, SaveToProfileOption } from "@/features/profile/SavedProfileUI";
import { buildSavePatch, hasNeed, pendingSave, toPlaceResult, type CentralProfile, type EnteredDetails, type ProfileNeed } from "@/features/profile/profile";
import "@/features/ratna/ratna.css";

export const RATNA_TITLE = FEATURES.ratna.name;
export const RATNA_SUBTITLE = FEATURES.ratna.subtitle;
export const RATNA_DESCRIPTION =
  "Explore personalized Vedic astrology interpretations, traditional Ratna significance, customary wearing guidance, and related products from the Bhagya Shop.";

const GENDERS: Gender[] = ["Male", "Female", "Other", "Prefer not to say"];
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const today = () => new Date().toISOString().slice(0, 10);

// Everything this calculation uses from the saved profile. Weight is specific to this tool and is never part of it.
const NEEDS: readonly ProfileNeed[] = ["name", "gender", "dateOfBirth", "birthTime", "birthPlace"];
const asGender = (g: string | null | undefined): Gender | "" => GENDERS.find((x) => x.toLowerCase() === (g ?? "").trim().toLowerCase()) ?? "";

/** Which saved values this form can actually use as they are (a saved gender it has no option for is asked again). */
function usableFrom(p: CentralProfile | null): Record<ProfileNeed, boolean> {
  const name = (p?.fullName ?? "").trim().replace(/s+/g, " ");
  return {
    name: hasNeed(p, "name") && name.length <= 80 && NAME_RE.test(name),
    gender: asGender(p?.gender) !== "",
    dateOfBirth: !!p?.dateOfBirth && p.dateOfBirth <= today() && Number(p.dateOfBirth.slice(0, 4)) >= 1800,
    birthTime: hasNeed(p, "birthTime"),
    birthPlace: hasNeed(p, "birthPlace"),
  };
}

interface Errors {
  name?: string;
  gender?: string;
  weight?: string;
  date?: string;
  time?: string;
  place?: string;
}

const FieldError = ({ id, text }: { id: string; text?: string }) =>
  text ? (
    <p id={id} role="alert" className="mt-1 text-sm font-medium text-[#9B2C1D]">
      {text}
    </p>
  ) : null;


const RatnaJyotish = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [draft] = useState(loadDraft); // the form as the user left it (Back from the result page)
  const [fullName, setFullName] = useState(draft?.fullName ?? "");
  const [gender, setGender] = useState<Gender | "">((draft?.gender as Gender | "") ?? "");
  const [weight, setWeight] = useState(draft?.weight ?? "");
  const [date, setDate] = useState(draft?.date ?? "");
  const [time, setTime] = useState(draft?.time ?? "");
  const [timeUnknown, setTimeUnknown] = useState(draft?.timeUnknown ?? false);
  const [place, setPlace] = useState<PlaceResult | null>(draft?.place ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { profile, isLoading: profileLoading, save: saveProfile } = useUserProfile();
  const usable = useMemo(() => usableFrom(profile), [profile]);
  // A returning draft shows every field exactly as the user left it; otherwise saved values stay out of the way.
  const [editing, setEditing] = useState(!!draft);
  const [saveChoice, setSaveChoice] = useState<boolean | null>(null);
  const seeded = useRef(false);
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

  // Fill from the saved profile once it arrives. Only empty fields are filled, so a draft is never overwritten.
  useEffect(() => {
    if (seeded.current || !profile) return;
    seeded.current = true;
    if (usable.name) setFullName((v) => v || profile.fullName);
    if (usable.gender) setGender((v) => v || asGender(profile.gender));
    if (usable.dateOfBirth) setDate((v) => v || (profile.dateOfBirth ?? ""));
    if (usable.birthTime && !draft) {
      setTime(profile.birthTime ?? "");
      setTimeUnknown(profile.birthTimeUnknown);
    }
    if (usable.birthPlace) setPlace((v) => v ?? toPlaceResult(profile.birthPlace));
  }, [profile, usable, draft]);

  const show = (n: ProfileNeed) => editing || !usable[n];
  const entered: EnteredDetails = { fullName, gender, dateOfBirth: date, birthTime: time, birthTimeUnknown: timeUnknown, birthPlace: place };
  const pending = pendingSave(profile, entered, NEEDS);
  const offerSave = !!profile && pending.added.length + pending.changed.length > 0;
  // Gaps are saved by default; replacing something already saved only happens if the user ticks the box.
  const doSave = saveChoice ?? pending.changed.length === 0;

  useEffect(() => {
    document.title = `${RATNA_TITLE} | Bhagya`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", RATNA_DESCRIPTION);
    return () => {
      if (meta && prev != null) meta.setAttribute("content", prev);
    };
  }, []);

  const validate = (): Errors => {
    const e: Errors = {};
    const name = fullName.trim().replace(/\s+/g, " ");
    if (name.length < 2) e.name = "Please enter your full name.";
    else if (name.length > 80 || !NAME_RE.test(name)) e.name = "Use letters, spaces, dots, hyphens and apostrophes only.";
    if (!gender) e.gender = "Please select an option.";
    if (weight.trim()) {
      const w = Number(weight);
      if (!Number.isFinite(w) || w < 2 || w > 300) e.weight = "Enter a weight between 2 and 300 kg.";
    }
    if (!date) e.date = "Please enter your date of birth.";
    else if (date > today()) e.date = "Date of birth cannot be in the future.";
    else if (Number(date.slice(0, 4)) < 1800) e.date = "Please enter a year from 1800 onwards.";
    if (!timeUnknown && !time) e.time = "Enter your exact birth time, or tick the box if you don't know it.";
    if (!place) e.place = "Please choose your birthplace from the suggestions.";
    return e;
  };

  const onSubmit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    if (inFlight.current) return; // prevent duplicate submissions
    const e = validate();
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length > 0 || !place) return;
    // Signed out: ask first. Every field stays as typed and the calculation runs once after sign-in.
    if (!requireSignIn(() => { void onSubmit({ preventDefault() {} } as React.FormEvent); })) return;

    inFlight.current = true;
    if (offerSave && doSave) {
      // Best effort: the calculation never waits on, or fails because of, saving to the profile.
      void saveProfile(buildSavePatch([...pending.added, ...pending.changed], entered)).catch(() => undefined);
    }
    clearResult(); // never show an old result for new inputs
    saveDraft({ fullName, gender, weight, date, time, timeUnknown, place });
    const startedAt = Date.now();
    setLoading(true);

    // Settle either way so success and failure share the minimum loader time.
    const outcome = await ratnaApi
      .calculate({
        fullName: fullName.trim().replace(/\s+/g, " "),
        gender: gender as Gender,
        weightKg: weight.trim() ? Math.round(Number(weight) * 10) / 10 : null,
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
          <h1 className="mt-4 font-home-serif text-4xl font-semibold tracking-[0.01em] text-[#592209] sm:text-5xl">{RATNA_TITLE}</h1>
          <span aria-hidden="true" className="mx-auto mt-3 block h-[3px] w-14 rounded-full bg-[#E58A45]" />
          <p className="mx-auto mt-4 max-w-xl text-lg leading-snug text-[#4A2E1F] sm:text-xl">{RATNA_SUBTITLE}</p>
        </header>

        <form onSubmit={onSubmit} noValidate className="ratna-card mt-8 p-5 sm:p-7" aria-label="Birth details">
          {profileLoading ? (
            <p role="status" className="mb-5 text-base text-[#6B4A37]">{t("savedProfile.loading")}</p>
          ) : (
            profile && !editing && NEEDS.some((n) => usable[n]) && (
              <SavedProfileCard profile={profile} needs={NEEDS.filter((n) => usable[n])} onChange={() => setEditing(true)} className="mb-5" />
            )
          )}
          <div className="grid gap-5 sm:grid-cols-2" hidden={profileLoading}>
            {show("name") && (
            <div className="sm:col-span-2">
              <label htmlFor="ratna-name" className="mb-1.5 block text-base font-medium text-[#301607]">
                Full name
              </label>
              <input
                id="ratna-name"
                type="text"
                autoComplete="name"
                maxLength={80}
                className="ratna-input"
                value={fullName}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "ratna-name-err" : undefined}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((p) => ({ ...p, name: undefined }));
                }}
              />
              <FieldError id="ratna-name-err" text={errors.name} />
            </div>
            )}

            {show("gender") && (
            <div>
              <label htmlFor="ratna-gender" className="mb-1.5 block text-base text-[#301607]">
                Gender
              </label>
              <select
                id="ratna-gender"
                className="ratna-input"
                value={gender}
                aria-invalid={!!errors.gender}
                aria-describedby={errors.gender ? "ratna-gender-err" : undefined}
                onChange={(e) => {
                  setGender(e.target.value as Gender | "");
                  setErrors((p) => ({ ...p, gender: undefined }));
                }}
              >
                <option value="">Select</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <FieldError id="ratna-gender-err" text={errors.gender} />
            </div>
            )}

            <div>
              <label htmlFor="ratna-weight" className="mb-1.5 block text-base text-[#301607]">
                Weight (kg)
              </label>
              <input
                id="ratna-weight"
                type="number"
                inputMode="decimal"
                min={2}
                max={300}
                step="0.1"
                className="ratna-input"
                placeholder="Optional"
                value={weight}
                aria-invalid={!!errors.weight}
                aria-describedby={errors.weight ? "ratna-weight-err" : undefined}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setErrors((p) => ({ ...p, weight: undefined }));
                }}
              />
              <FieldError id="ratna-weight-err" text={errors.weight} />
            </div>

            {show("dateOfBirth") && (
            <div>
              <label htmlFor="ratna-dob" className="mb-1.5 block text-base font-medium text-[#301607]">
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
              <FieldError id="ratna-dob-err" text={errors.date} />
            </div>
            )}

            {show("birthTime") && (
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
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-base text-[#4A2E1F]">
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
              {timeUnknown && (
                <p className="mt-1 text-sm text-[#6B4A37]" data-testid="unknown-time-note">
                  Without a birth time the Lagna (Ascendant), houses and dasha cannot be calculated. You will get a
                  limited, date-based reading instead.
                </p>
              )}
              <FieldError id="ratna-tob-err" text={errors.time} />
            </div>
            )}
          </div>

          {show("birthPlace") && !profileLoading && (
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
          )}

          {offerSave && !profileLoading && <SaveToProfileOption replaces={pending.changed.length > 0} checked={doSave} onChange={setSaveChoice} id="ratna-save-profile" />}

          {apiError && (
            <div role="alert" className="mt-5 rounded-lg border border-[#9B2C1D]/40 bg-[#9B2C1D]/10 p-3 text-[#7A2216]">
              {apiError} Your details are still filled in, so you can try again.
            </div>
          )}

          <button type="submit" className="ratna-btn mt-6 w-full" disabled={loading || profileLoading}>
            CALCULATE MY RATNA
          </button>
        </form>
      </section>
      <FeatureFaq feature="ratna" />
    </>
  );
};

export default RatnaJyotish;
