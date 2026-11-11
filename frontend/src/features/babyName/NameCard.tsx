import { useRef, useState } from "react";
import { useGlossary } from "@/i18n/glossary";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Check, Copy, Heart, Share2, Volume2 } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { BabyName } from "./names";
import type { Syllable } from "./syllables";

const GENDER: Record<BabyName["gender"], string> = { boy: "babyName.card.boy", girl: "babyName.card.girl", neutral: "babyName.card.neutral" };
const EXTRA: Partial<Record<BabyName["styles"][number], string>> = { spiritual: "babyName.kind.spiritual", nature: "babyName.kind.nature", mythology: "babyName.kind.mythology", unique: "babyName.kind.unique" };
const VERIFY: Record<BabyName["verification"]["status"], string> = {
  "source-listed": "babyName.card.verifySource",
  "web-checked": "babyName.card.verifyWeb",
  editorial: "babyName.card.verifyEditorial",
};
const POPULARITY: Record<BabyName["popularity"], string> = { Modern: "babyName.kind.modern", Traditional: "babyName.kind.traditional" };

const Chip = ({ children, tone = "plain" }: { children: string; tone?: "plain" | "gold" }) => (
  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone === "gold" ? "bg-[#C9873A]/30 text-[#592209]" : "bg-[#592209]/10 text-[#592209]"}`}>{children}</span>
);

const Row = ({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <div className={wide ? "col-span-2" : ""}>
    <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">{label}</dt>
    <dd className="mt-0.5 text-[14.5px] leading-snug text-[#301607]">{children}</dd>
  </div>
);

const action = "flex items-center justify-center gap-1.5 rounded-xl border border-[#592209]/25 bg-white/60 px-2 py-2 text-xs font-semibold text-[#592209] transition-colors hover:bg-[#592209] hover:text-[#F5E9D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9873A]";

/** The text copied or shared for a name. */
export const shareText = (n: BabyName): string => `${n.name} (${n.deva}): ${n.meaning}. Found with Baby Name Jyotish on Bhagya.`;

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the textarea method */ }
  try {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  } catch {
    return false;
  }
}

export default function NameCard({ n, syllable, saved, onToggle }: { n: BabyName; syllable: Syllable; saved: boolean; onToggle: (name: string) => void }) {
  const { t } = useTranslation();
  const tts = useTextToSpeech();
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const say = (msg: string) => {
    setNote(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 2000);
  };
  const copy = async () => say((await copyToClipboard(shareText(n))) ? t("babyName.card.copied") : t("babyName.card.copyFailed"));
  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url?: string }) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: `${n.name} (${n.deva})`, text: shareText(n), url: typeof location !== "undefined" ? location.href : undefined });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return; // the parent closed the share sheet
      }
    }
    await copy(); // browsers without a share sheet: copy the text instead
  };
  // At most three tags so every card reads the same: gender, era, and one more.
  const extra = n.styles.map((s) => EXTRA[s]).find(Boolean) ?? (n.name.length <= 5 ? "babyName.kind.short" : undefined);

  return (
    <li data-testid="name-card" className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#592209]/15 bg-[#FFFCF5] shadow-[0_14px_34px_-22px_rgba(89,34,9,0.55)] transition-shadow hover:shadow-[0_18px_40px_-20px_rgba(89,34,9,0.6)]">
      <div className="bg-gradient-to-br from-[#FFF1CF] via-[#FBE6BE] to-[#F4D9A8] px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="break-words text-[1.65rem] font-bold leading-tight text-[#301607]" style={{ fontFamily: "'Astra','Cinzel',serif" }}>{n.name}</h4>
            <p lang="hi" className="mt-1 text-[1.35rem] leading-snug text-[#8A3A12]">{n.deva}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggle(n.name)}
            aria-pressed={saved}
            aria-label={saved ? t("babyName.card.removeFav", { name: n.name }) : t("babyName.card.saveFav", { name: n.name })}
            className="shrink-0 rounded-full border border-[#592209]/25 bg-white/70 p-2 text-[#592209] transition-colors hover:bg-[#592209]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9873A] aria-pressed:border-[#592209] aria-pressed:bg-[#592209] aria-pressed:text-[#F7DC8A]"
          >
            <Heart size={18} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone="gold">{t(GENDER[n.gender])}</Chip>
          <Chip>{t(POPULARITY[n.popularity])}</Chip>
          {extra && <Chip>{t(extra)}</Chip>}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Row label={t("babyName.card.meaning")} wide>{n.meaning}</Row>
          <Row label={t("babyName.card.pronunciation")}><span className="font-semibold">{n.pronunciation}</span></Row>
          <Row label={t("babyName.card.syllable")}>{syllable.roman} <span lang="hi">({syllable.deva})</span></Row>
          <Row label={t("babyName.card.origin")} wide>{n.origin}</Row>
        </dl>

        <p data-testid="name-verification" className="mt-4 flex items-center gap-1.5 text-xs text-[#6B4A37]" title={n.verification.source}>
          <BadgeCheck size={14} aria-hidden="true" className={n.verification.status === "editorial" ? "text-[#8A5A1E]/60" : "text-[#2F7D4F]"} />
          {t(VERIFY[n.verification.status])}
        </p>

        <div className={`mt-auto grid gap-2 pt-4 ${tts.supported ? "grid-cols-3" : "grid-cols-2"}`}>
          {tts.supported && (
            <button type="button" onClick={() => (tts.speaking ? tts.stop() : tts.speak(n.deva, "hi-IN"))} className={action}>
              <Volume2 size={14} aria-hidden="true" /> {tts.speaking ? t("babyName.card.stop") : t("babyName.card.listen")}
            </button>
          )}
          <button type="button" onClick={copy} className={action} aria-label={t("babyName.card.copyName", { name: n.name })}>
            <Copy size={14} aria-hidden="true" /> {t("common.copy")}
          </button>
          <button type="button" onClick={share} className={action} aria-label={t("babyName.card.shareName", { name: n.name })}>
            <Share2 size={14} aria-hidden="true" /> {t("common.share")}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-1.5 h-4 text-center text-xs font-semibold text-[#592209]">{note && <><Check size={12} className="mr-1 inline" aria-hidden="true" />{note}</>}</p>
      </div>
    </li>
  );
}
