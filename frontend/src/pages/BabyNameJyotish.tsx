import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Baby } from "lucide-react";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { requireSignIn } from "@/lib/authedFetch";
import { BABY_NAME_FEATURE } from "@/features/babyName/feature";
import { babyNameApi } from "@/features/babyName/api";
import BabyNameForm, { type BabyNameFormValues } from "@/features/babyName/BabyNameForm";
import BabyNameResults from "@/features/babyName/BabyNameResults";
import type { BabyNameResult, NamePreference } from "@/features/babyName/types";

export default function BabyNameJyotish() {
  const { t } = useTranslation();
  useFeatureTitle(BABY_NAME_FEATURE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<{ result: BabyNameResult; preference: NamePreference; preferredName: string } | null>(null);
  const run = useRef(0);

  const submit = async (v: BabyNameFormValues) => {
    if (busy) return;
    if (!requireSignIn(() => { void submit(v); })) return; // signed out: ask, keep the form, then run this once
    setError("");
    setBusy(true);
    const id = ++run.current;
    try {
      const result = await babyNameApi.calculate({
        dateOfBirth: v.dateOfBirth,
        timeOfBirth: v.timeOfBirth,
        timeApproximate: v.timeApproximate,
        place: { name: v.place.name, admin1: v.place.admin1, country: v.place.country, latitude: v.place.latitude, longitude: v.place.longitude, timezone: v.place.timezone },
      });
      if (id !== run.current) return;
      setShown({ result, preference: v.preference, preferredName: v.preferredName });
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (id !== run.current) return;
      setError((e as Error)?.message || t("babyName.page.calcError"));
    } finally {
      if (id === run.current) setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-3xl pt-6 text-center">
        <div className="relative mx-auto mb-6 aspect-[600/358] w-64 sm:w-80">
          <span aria-hidden="true" className="absolute -inset-6 rounded-[50%] bg-[radial-gradient(ellipse,rgba(201,135,58,0.32),transparent_70%)]" />
          <img
            src="/images/baby-name/baby-name-logo.png"
            alt={t("babyName.page.imageAlt")}
            width={600}
            height={358}
            className="relative h-full w-full rounded-[50%] border-[3px] border-[#C9873A] bg-[#4B1A6B] object-cover shadow-[0_16px_36px_-14px_rgba(89,34,9,0.65)]"
          />
        </div>
        <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#592209]">
          <Baby size={16} aria-hidden="true" /> <span lang="hi" className="text-sm font-bold normal-case tracking-normal">शुभ नाम</span>
        </p>
        <h1 className="mb-4 text-4xl text-[#301607] sm:text-6xl" style={{ fontFamily: "'Astra','Cinzel',serif" }}>{t("features.baby-name-jyotish.name", { defaultValue: BABY_NAME_FEATURE.name })}</h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#4A2E1F] sm:text-lg">{t("features.baby-name-jyotish.subtitle", { defaultValue: BABY_NAME_FEATURE.subtitle })}</p>
        {!shown && (
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#6B4A37]">
            {t("babyName.page.intro")}
          </p>
        )}
      </header>

      {shown ? (
        <>
          <BabyNameResults result={shown.result} preference={shown.preference} preferredName={shown.preferredName} />
          <div className="mt-10 text-center">
            <button type="button" onClick={() => { setShown(null); window.scrollTo({ top: 0 }); }} className="rounded-full border border-[#592209]/40 px-8 py-3 text-sm uppercase tracking-widest text-[#592209] hover:bg-[#592209]/10">
              ✦ {t("babyName.page.another")}
            </button>
          </div>
        </>
      ) : (
        <BabyNameForm onSubmit={submit} busy={busy} serverError={error} />
      )}
    </div>
  );
}
