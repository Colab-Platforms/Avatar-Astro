import { useRef, useState } from "react";
import { Car } from "lucide-react";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { requireSignIn } from "@/lib/authedFetch";
import { LUCKY_VEHICLE_FEATURE } from "@/data/featureCatalog";
import { vehicleNumberApi } from "@/features/vehicleNumber/api";
import VehicleForm, { type VehicleFormValues } from "@/features/vehicleNumber/VehicleForm";
import VehicleResults from "@/features/vehicleNumber/VehicleResults";
import type { VehicleProfileResult, VehicleQuery } from "@/features/vehicleNumber/types";

export default function LuckyVehicleNumber() {
  useFeatureTitle(LUCKY_VEHICLE_FEATURE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<{ profile: VehicleProfileResult; query: VehicleQuery } | null>(null);
  const run = useRef(0);

  const submit = async (v: VehicleFormValues) => {
    if (busy) return;
    if (!requireSignIn(() => { void submit(v); })) return; // signed out: ask, keep the form, then run this once
    setError("");
    setBusy(true);
    const id = ++run.current;
    try {
      const profile = await vehicleNumberApi.profile({
        dateOfBirth: v.dateOfBirth,
        timeOfBirth: v.timeOfBirth,
        place: { name: v.place.name, admin1: v.place.admin1, country: v.place.country, latitude: v.place.latitude, longitude: v.place.longitude, timezone: v.place.timezone },
      });
      if (id !== run.current) return;
      setShown({
        profile,
        query: { name: v.name, dateOfBirth: v.dateOfBirth, vehicleType: v.vehicleType, mode: v.mode, scope: v.scope, existing: v.existing, compare: v.compare, preferred: v.preferred, range: v.range },
      });
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (id !== run.current) return;
      setError((e as Error)?.message || "We could not calculate your birth profile. Please check the details and try again.");
    } finally {
      if (id === run.current) setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-3xl pt-6 text-center">
        <div className="relative mx-auto mb-5 aspect-[2/1] w-64 sm:w-80">
          <span aria-hidden="true" className="absolute -inset-6 rounded-[50%] bg-[radial-gradient(ellipse,rgba(201,135,58,0.32),transparent_70%)]" />
          <img
            src="/images/tools/lucky-vehicle-number.svg"
            alt="Lucky Vehicle Number: a car and a registration plate under the stars"
            width={640}
            height={320}
            className="relative h-full w-full rounded-[50%] border-[3px] border-[#C9873A] bg-[#3b1706] object-cover shadow-[0_16px_36px_-14px_rgba(89,34,9,0.65)]"
          />
        </div>
        <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#592209]">
          <Car size={16} aria-hidden="true" /> <span lang="hi" className="text-sm font-bold normal-case tracking-normal">वाहन अंक ज्योतिष</span>
        </p>
        <h1 className="mb-4 text-4xl text-[#301607] sm:text-6xl" style={{ fontFamily: "'Astra','Cinzel',serif" }}>{LUCKY_VEHICLE_FEATURE.name}</h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#4A2E1F] sm:text-lg">{LUCKY_VEHICLE_FEATURE.subtitle}</p>
        {!shown && (
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#6B4A37]">
            Enter your birth details. We calculate your birth profile, Birth Number and Life Path, then read vehicle numbers against them with a method we show you step by step.
          </p>
        )}
      </header>

      {shown ? (
        <>
          <VehicleResults profile={shown.profile} query={shown.query} />
          <div className="mt-10 text-center">
            <button type="button" onClick={() => { setShown(null); window.scrollTo({ top: 0 }); }} className="rounded-full border border-[#592209]/40 px-8 py-3 text-sm uppercase tracking-widest text-[#592209] hover:bg-[#592209]/10">
              ✦ Start Again
            </button>
          </div>
        </>
      ) : (
        <VehicleForm onSubmit={submit} busy={busy} serverError={error} />
      )}
    </div>
  );
}
