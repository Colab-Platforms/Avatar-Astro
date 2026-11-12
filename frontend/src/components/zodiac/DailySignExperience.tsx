import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Briefcase, Clover, HeartHandshake, Leaf, RotateCw, Shuffle, Smile, Sparkles, Sun, Target } from "lucide-react";
import i18n from "@/i18n";
import { intlTag } from "@/features/muhurat/format";
import { useZodiacText, type ZodiacSign } from "@/data/zodiacData";
import { MAJOR_ARCANA, shuffleDeck, type TarotCard } from "@/data/tarotData";
import TarotArt from "@/components/tarot/TarotArt";
import HoroscopeStreakPanel from "@/features/points/HoroscopeStreakPanel";
import { fetchDailyHoroscope, formatDateLabel, HoroscopeError, msUntilNextDay, todayKey, type DailyHoroscope } from "@/lib/dailyHoroscope";

// Daily horoscope experience for one Sun sign, shown at the top of /zodiac/:sign. Order on the page:
//   header (sign + today's date) → shuffle + face-down deck → the card you picked → the reading (shown once) → disclaimer.
// The horoscope text always comes from the daily horoscope service (one stored reading per sign per day). The card is a
// reflective prompt taken from the Tarot deck's own card meanings; it never changes or adds to the horoscope text.

type Load =
  | { state: "loading" }
  | { state: "ready"; data: DailyHoroscope }
  | { state: "unavailable" }
  | { state: "error"; message: string };

/** The date line: English keeps its fixed layout; other languages use Intl (Latin digits) for the same calendar date. */
const dateLabel = (dateKey: string): string =>
  !i18n.language || i18n.language === "en"
    ? formatDateLabel(dateKey)
    : new Intl.DateTimeFormat(intlTag(), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${dateKey}T00:00:00Z`));

/** One reading per sign per day. The key includes the date, so yesterday's text is never shown for today. */
const memory = new Map<string, DailyHoroscope>();

export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const sync = () => setToday(todayKey());
    const timer = setTimeout(sync, msUntilNextDay());
    document.addEventListener("visibilitychange", sync);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", sync); };
  }, [today]);
  return today;
}

export function useDailyReading(signName: string, today: string): { load: Load; retry: () => void } {
  const [load, setLoad] = useState<Load>(() => {
    const c = memory.get(`${signName}:${todayKey()}`);
    return c ? { state: "ready", data: c } : { state: "loading" };
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const cached = memory.get(`${signName}:${today}`);
    if (cached) { setLoad({ state: "ready", data: cached }); return; }
    const controller = new AbortController();
    setLoad({ state: "loading" });
    fetchDailyHoroscope(signName, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        memory.set(`${signName}:${data.date}`, data);
        setLoad({ state: "ready", data });
      })
      .catch((e) => {
        if (controller.signal.aborted || e?.name === "AbortError") return;
        setLoad(e instanceof HoroscopeError && e.kind === "unavailable" ? { state: "unavailable" } : { state: "error", message: e?.message || i18n.t("horoscope.daily.errorFallback") });
      });
    return () => controller.abort();
  }, [signName, today, attempt]);
  return { load, retry: () => setAttempt((n) => n + 1) };
}

// ─── Deck ────────────────────────────────────────────────────────────────────

const DECK_SIZE = 5;
const CARD_BACK = "/images/tarot/cards/tarot-card-back.png"; // the same card back the Tarot readings use
const drawDeck = (): TarotCard[] => shuffleDeck(MAJOR_ARCANA).slice(0, DECK_SIZE);

const CardBack = () => {
  const [failed, setFailed] = useState(false);
  return failed
    ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#5A2208_0%,#2A0F04_75%)]" />
    : <img src={CARD_BACK} alt="" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />;
};

const DeckCard = ({ card, slot, flipped, phase, disabled, onFlip }: {
  card: TarotCard; slot: number; flipped: boolean; phase: "idle" | "gather" | "spread"; disabled: boolean; onFlip: () => void;
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const centre = (DECK_SIZE - 1) / 2;
  return (
    <motion.div layout transition={{ type: "spring", stiffness: 260, damping: 26 }} className="shrink-0" style={{ width: "var(--w)" }}>
      <motion.div
        animate={phase === "gather" && !reduce ? { x: `${(centre - slot) * 92}%`, rotate: (slot - centre) * 7, y: -6 } : { x: 0, rotate: 0, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.45, ease: "easeInOut" }}
        style={{ perspective: 900 }}
      >
        <motion.button
          type="button"
          onClick={onFlip}
          disabled={disabled}
          data-testid={`daily-card-${slot}`}
          data-card={card.name}
          aria-pressed={flipped}
          aria-label={flipped ? t("horoscope.daily.cardSelected", { name: card.name }) : t("horoscope.daily.cardFaceDown", { number: slot + 1 })}
          whileHover={disabled || flipped ? {} : { y: -8, scale: 1.04 }}
          whileTap={disabled ? {} : { scale: 0.97 }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: reduce ? 0.01 : 0.7, ease: "easeInOut" }}
          className="relative block w-full rounded-xl p-0 shadow-lg disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#592209]"
          style={{ aspectRatio: "2 / 3", transformStyle: "preserve-3d" }}
        >
          <span className="absolute inset-0 overflow-hidden rounded-xl border-2 border-[#C9873A] bg-[#2A0F04]" style={{ backfaceVisibility: "hidden" }}><CardBack /></span>
          <span className="absolute inset-0 overflow-hidden rounded-xl border-2 border-[#E9B872] bg-[#2A0F04] ring-2 ring-[#592209]" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <TarotArt card={card} />
            <span className="absolute left-0 right-0 top-0 bg-gradient-to-b from-[rgba(18,6,2,.88)] to-transparent px-1 pb-3 pt-1.5 text-center text-[11px] font-bold tracking-[0.14em] text-[#F5E9D6]">{card.number}</span>
            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(18,6,2,.95)] via-[rgba(18,6,2,.7)] to-transparent px-1 pb-1.5 pt-5 text-center text-[clamp(9px,2.2vw,13px)] font-bold uppercase leading-tight text-[#F5E9D6]">{card.name}</span>
          </span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

/** The picked card: large artwork, name, and the deck's own meaning. */
const SelectedCard = ({ card, sign }: { card: TarotCard; sign: ZodiacSign }) => {
  const { t } = useTranslation();
  const z = useZodiacText();
  return (
  <motion.div data-testid="card-reveal" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3 }}
    className="mx-auto mt-8 grid max-w-2xl gap-5 rounded-2xl border-2 border-[#592209]/35 bg-[#FBF5EC] p-5 shadow-lg sm:grid-cols-[150px_1fr] md:p-6">
    <div className="relative mx-auto aspect-[2/3] w-[130px] overflow-hidden rounded-xl border-2 border-[#C9873A] bg-[#2A0F04] shadow-md sm:w-full">
      <TarotArt card={card} />
      <span className="absolute left-0 right-0 top-0 bg-gradient-to-b from-[rgba(18,6,2,.88)] to-transparent px-1 pb-3 pt-1.5 text-center text-xs font-bold tracking-[0.14em] text-[#F5E9D6]">{card.number}</span>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B4A37]">{t("horoscope.daily.yourCard", { sign: z.sign(sign.name) })}</p>
      <h3 className="mt-1 text-2xl font-bold text-[#592209]" data-testid="selected-card-name">{card.name}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {card.keywords.map((k) => <li key={k} className="rounded-full border border-[#592209]/25 bg-[#592209]/[0.06] px-3 py-0.5 text-sm text-[#592209]">{k}</li>)}
      </ul>
      <p className="mt-3 text-[17px] leading-relaxed text-[#301607]" data-testid="card-text">{card.meaning}</p>
      <p className="mt-2 text-sm italic text-[#6B4A37]">{t("horoscope.daily.cardNote")}</p>
    </div>
  </motion.div>
  );
};

// ─── Reading (shown once, in this order) ──────────────────────────────────────

const SECTIONS = [
  { key: "career", title: "Career & Finance", q: "Work, business and money today", Icon: Briefcase },
  { key: "love", title: "Love & Relationships", q: "How relationships may feel today", Icon: HeartHandshake },
  { key: "health", title: "Health & Well-being", q: "General wellness guidance", Icon: Leaf },
  { key: "mood", title: "Energy & Mood", q: "Your likely emotional theme", Icon: Smile },
  { key: "opportunities", title: "Opportunities Today", q: "What you can make use of", Icon: Sparkles },
  { key: "mindful", title: "Be Mindful Of", q: "What to watch out for", Icon: AlertTriangle },
] as const;

const Reading = ({ data, sign }: { data: DailyHoroscope; sign: ZodiacSign }) => {
  const { t } = useTranslation();
  const z = useZodiacText();
  const s = data.sections;
  const hasLucky = !!(s.lucky && (s.lucky.color || s.lucky.number));
  return (
    <section aria-label={t("horoscope.daily.readingFor", { sign: z.sign(sign.name) })} className="mt-10" data-testid="daily-reading">
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-[#592209] to-[#3b1706] p-6 text-[#F5E9D6] shadow-lg md:p-8" data-testid="section-overview">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#E9B872]"><Sun className="h-4 w-4" aria-hidden /> {t("horoscope.daily.overview")}</p>
        <p className="mt-2 text-xl leading-relaxed md:text-2xl">{s.overview}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ key, title, q, Icon }, i) => (
          <motion.article key={key} data-testid={`section-${key}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.4 }}
            className="rounded-2xl border border-[#592209]/25 bg-[#FBF5EC] p-5 shadow-sm">
            <header className="mb-3 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#592209]/10 text-[#592209]"><Icon className="h-5 w-5" aria-hidden /></span>
              <div><h3 className="text-lg font-bold leading-tight text-[#592209]">{t(`horoscope.daily.sections.${key}.title`, { defaultValue: title })}</h3><p className="text-[13px] italic text-[#6B4A37]">{t(`horoscope.daily.sections.${key}.hint`, { defaultValue: q })}</p></div>
            </header>
            <p className="text-[16.5px] leading-relaxed text-[#301607]">{s[key]}</p>
          </motion.article>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article data-testid="section-guidance" className={`rounded-2xl border border-[#C9873A] bg-[#FFF7E6] p-5 shadow-[inset_4px_0_0_#C9873A] ${hasLucky ? "" : "md:col-span-2"}`}>
          <header className="mb-2 flex items-center gap-2 text-[#592209]"><Target className="h-5 w-5" aria-hidden /><h3 className="text-lg font-bold">{t("horoscope.daily.guidance")}</h3></header>
          <p className="text-[17px] font-medium leading-relaxed text-[#301607]">{s.guidance}</p>
        </article>
        {hasLucky && (
          <article className="rounded-2xl border border-[#592209]/25 bg-[#F5E9D6] p-5" data-testid="lucky-details">
            <header className="mb-2 flex items-center gap-2 text-[#592209]"><Clover className="h-5 w-5" aria-hidden /><h3 className="text-lg font-bold">{t("horoscope.daily.luckyDetails")}</h3></header>
            <ul className="flex flex-wrap gap-2">
              {s.lucky?.color && <li className="rounded-full border border-[#592209]/30 bg-[#FBF5EC] px-4 py-1.5 text-[15px] text-[#301607]">{t("horoscope.daily.luckyColour")} <strong>{s.lucky.color}</strong></li>}
              {s.lucky?.number && <li className="rounded-full border border-[#592209]/30 bg-[#FBF5EC] px-4 py-1.5 text-[15px] text-[#301607]">{t("horoscope.daily.luckyNumber")} <strong>{s.lucky.number}</strong></li>}
            </ul>
          </article>
        )}
      </div>
    </section>
  );
};

// ─── Experience ──────────────────────────────────────────────────────────────

const DailySignExperience = ({ sign }: { sign: ZodiacSign }) => {
  const { t } = useTranslation();
  const z = useZodiacText();
  const today = useToday();
  const { load, retry } = useDailyReading(sign.name, today);
  const [deck, setDeck] = useState<TarotCard[]>(drawDeck);
  const [phase, setPhase] = useState<"idle" | "gather" | "spread">("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduce = useReducedMotion();
  // What the visitor has done on this page for this sign. Reported with the daily completion (the server does not verify these).
  const [steps, setSteps] = useState({ read: false, shuffled: false, revealed: false });
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { setPicked(null); setDeck(drawDeck()); setSteps({ read: false, shuffled: false, revealed: false }); }, [sign.name]);

  const shuffling = phase !== "idle";
  const shuffle = useCallback(() => {
    if (shuffling) return;
    setPicked(null); // every card goes face-down again
    setSteps((s) => (s.shuffled ? s : { ...s, shuffled: true }));
    setPhase("gather");
    const t = reduce ? 0 : 1;
    timers.current.push(setTimeout(() => { setDeck(drawDeck()); setPhase("spread"); }, 650 * t));
    timers.current.push(setTimeout(() => setPhase("idle"), 1350 * t + 20));
  }, [shuffling, reduce]);

  const blocked = load.state === "unavailable" || load.state === "error";
  const pick = (slot: number) => {
    if (shuffling || blocked) return;
    setPicked((cur) => (cur === slot ? null : slot));
    setSteps((s) => (s.revealed ? s : { ...s, revealed: true }));
  };
  // The reading counts as read once it is on screen.
  const readingShown = picked !== null && load.state === "ready";
  useEffect(() => { if (readingShown) setSteps((s) => (s.read ? s : { ...s, read: true })); }, [readingShown]);
  const date = load.state === "ready" ? load.data.date : today;

  return (
    <section aria-labelledby="daily-h" className="mb-14" data-testid="daily-experience">
      <style>{`.trr-daily{--w:clamp(60px,15.5vw,150px)}`}</style>

      {/* 1. header */}
      <div className="mb-6 text-center">
        <h1 id="daily-h" className="text-3xl font-bold text-foreground md:text-5xl">{t("horoscope.daily.heading", { sign: z.sign(sign.name) })}</h1>
        <p className="mt-2 text-lg text-muted-foreground" data-testid="reading-date">{dateLabel(date)}</p>
      </div>

      {blocked && (
        <div role="alert" className="mx-auto mb-6 max-w-xl rounded-2xl border border-[#592209]/30 bg-[#FBF5EC] p-5 text-center" data-testid={load.state === "unavailable" ? "reading-unavailable" : "reading-error"}>
          <p className="font-semibold text-[#592209]">{load.state === "unavailable" ? t("horoscope.daily.unavailableTitle", { sign: z.sign(sign.name) }) : t("horoscope.daily.errorTitle")}</p>
          <p className="mt-1 text-sm text-[#4A3022]">{load.state === "unavailable" ? t("horoscope.daily.unavailableBody") : load.message}</p>
          <button type="button" onClick={retry} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#592209] px-4 py-2 text-sm font-semibold text-[#F5E9D6] hover:bg-[#461B07]">
            <RotateCw className="h-4 w-4" aria-hidden /> {t("horoscope.daily.tryAgain")}
          </button>
        </div>
      )}

      {/* 2. shuffle + deck + instruction */}
      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={shuffle} disabled={shuffling} data-testid="shuffle-cards" aria-label={t("horoscope.daily.shuffleAria")}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border-[1.5px] border-[#592209] bg-[#592209] px-8 py-3 text-[15px] font-bold uppercase tracking-[0.14em] text-[#F5E9D6] shadow-lg transition hover:bg-[#461B07] disabled:cursor-wait disabled:opacity-70">
          <Shuffle className={`h-5 w-5 ${shuffling ? "animate-spin" : ""}`} aria-hidden />
          <span aria-live="polite">{shuffling ? t("horoscope.daily.shuffling") : t("horoscope.daily.shuffle")}</span>
        </button>
        <p className="text-center text-[#4A3022]" data-testid="deck-instruction">
          {picked === null ? t("horoscope.daily.instructionPick", { sign: z.sign(sign.name) }) : t("horoscope.daily.instructionClose")}
        </p>
      </div>

      <div className="trr-daily mt-5 flex items-start justify-center gap-[clamp(8px,2vw,22px)] px-2 pt-2" role="group" aria-label={t("horoscope.daily.faceDownCards")} data-testid="daily-cards">
        {deck.map((card, slot) => (
          <DeckCard key={card.id} card={card} slot={slot} flipped={picked === slot} phase={phase} disabled={shuffling || blocked} onFlip={() => pick(slot)} />
        ))}
      </div>

      {/* 3. the picked card */}
      <AnimatePresence mode="wait">{picked !== null && <SelectedCard key={deck[picked].id} card={deck[picked]} sign={sign} />}</AnimatePresence>

      {/* 4–12. the reading, once */}
      {picked !== null && load.state === "loading" && (
        <div className="mt-10 space-y-3" role="status" aria-label={t("horoscope.daily.loading")} data-testid="reading-loading">
          <div className="h-24 animate-pulse rounded-2xl bg-[#592209]/15" /><div className="h-4 w-2/3 animate-pulse rounded bg-[#592209]/10" /><div className="h-4 w-1/2 animate-pulse rounded bg-[#592209]/10" />
        </div>
      )}
      {picked !== null && load.state === "ready" && <Reading data={load.data} sign={sign} />}

      {/* 13. disclaimer */}
      {picked !== null && load.state === "ready" && (
        <p className="mx-auto mt-8 max-w-2xl rounded-xl border border-[#C9873A]/50 bg-[#FFF7E6] p-4 text-center text-sm leading-relaxed text-[#301607]" data-testid="system-note">
          <Trans i18nKey="horoscope.daily.systemNote" values={{ sign: z.sign(sign.name) }} components={{ b: <strong />, i: <em />, l: <Link to="/birth-chart" className="font-semibold text-[#592209] underline" /> }} />
        </p>
      )}

      {/* 14. streak and rewards (signed-in users; everything shown comes from the server) */}
      <HoroscopeStreakPanel sign={sign.name} readingDate={load.state === "ready" ? load.data.date : undefined} steps={steps} />
    </section>
  );
};

export default DailySignExperience;
