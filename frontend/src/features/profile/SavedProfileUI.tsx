import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import type { CentralProfile, ProfileNeed } from "./profile";

const LABEL: Record<ProfileNeed, string> = {
  name: "savedProfile.name",
  gender: "savedProfile.gender",
  dateOfBirth: "savedProfile.dateOfBirth",
  birthTime: "savedProfile.birthTime",
  birthPlace: "savedProfile.birthPlace",
};

const longDate = (iso: string, lng: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  // Built in UTC and formatted in UTC so the calendar date never shifts with the viewer's time zone.
  return new Intl.DateTimeFormat(!lng || lng === "en" ? "en-IN" : lng, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};

/**
 * Small confirmation that saved profile details are being used, with a "Change" action.
 * Lists only the needs it is asked about (the ones the form is not asking for again).
 */
export function SavedProfileCard({ profile, needs, onChange, className = "" }: { profile: CentralProfile; needs: readonly ProfileNeed[]; onChange?: () => void; className?: string }) {
  const { t, i18n } = useTranslation();
  const value = (n: ProfileNeed): string => {
    switch (n) {
      case "name": return profile.fullName;
      case "gender": return profile.gender ?? "";
      case "dateOfBirth": return profile.dateOfBirth ? longDate(profile.dateOfBirth, i18n.language) : "";
      case "birthTime": return profile.birthTimeUnknown ? t("savedProfile.timeUnknown") : profile.birthTime ?? "";
      case "birthPlace": return profile.birthPlace ? [profile.birthPlace.name, profile.birthPlace.admin1, profile.birthPlace.country].filter(Boolean).join(", ") : "";
    }
  };
  const rows = needs.map((n) => ({ n, v: value(n) })).filter((r) => r.v);
  if (rows.length === 0) return null;
  return (
    <section aria-label={t("savedProfile.title")} className={`rounded-xl border border-[#592209]/20 bg-[#F5E9D6]/60 p-4 ${className}`} data-testid="saved-profile-card">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-[#301607]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2F7D5B]" aria-hidden="true" />
          {t("savedProfile.title")}
        </p>
        {onChange && (
          <button type="button" onClick={onChange} className="rounded text-sm font-semibold text-[#803003] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003]">
            {t("savedProfile.edit")}
          </button>
        )}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
        {rows.map(({ n, v }) => (
          <div key={n} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B4A37]">{t(LABEL[n])}</dt>
            <dd className="truncate text-[#301607]" title={v}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Explicit, visible choice to keep what was typed. Never saves anything by itself. */
export function SaveToProfileOption({ replaces, checked, onChange, id = "save-to-profile" }: { replaces: boolean; checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  const { t } = useTranslation();
  return (
    <label htmlFor={id} className="mt-4 flex cursor-pointer items-start gap-2.5 text-[15px] text-[#4A2E1F]">
      <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#592209]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{replaces ? t("savedProfile.saveChanged") : t("savedProfile.saveAdded")}</span>
    </label>
  );
}
