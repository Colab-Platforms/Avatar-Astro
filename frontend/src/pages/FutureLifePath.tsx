import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import FeatureFaq from "@/components/FeatureFaq";
import FullScreenLoader from "@/components/Loader/FullScreenLoader";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { Compass, Loader2, Sun, Moon, Lightbulb, BookOpen, Sparkles, Info } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { authedFetch, requireSignIn, SignInRequiredError } from "@/lib/authedFetch";
import { scriptureForFocus } from "@/lib/lifePathScripture";
import LocationPicker from "@/features/ratna/LocationPicker";
import type { PlaceResult } from "@/features/ratna/types";
import "@/features/ratna/ratna.css";

const FOCUS_OPTIONS = [
  { value: "general", label: "General" },
  { value: "career", label: "Career" },
  { value: "relationships", label: "Relationships" },
  { value: "personal-growth", label: "Personal growth" },
  { value: "finance", label: "Money" },
];

interface CalendarFact { label: string; value: string }
interface CalendarBlock { title: string; reckoned: string; facts: CalendarFact[]; notes: string[] }

interface LifePathBasis {
  used: { label: string; value: string }[];
  notProvided: string[];
  calculated: { label: string; value: string; how: string }[];
  limits: string[];
}

interface LifePathResult {
  panchang?: { birth: CalendarBlock | null; today: CalendarBlock | null; birthNeedsPlace?: boolean };
  panchangBased?: boolean;
  basis?: LifePathBasis;
  meaning?: string;
  lifePathOverview?: string;
  oneGoodStep?: string;
  thought?: string;
}

/** Keep only calendar blocks that really contain facts, so nothing empty or malformed is drawn. */
function cleanBlock(b: unknown): CalendarBlock | null {
  const x = b as Partial<CalendarBlock> | null;
  if (!x || typeof x !== "object" || !Array.isArray(x.facts)) return null;
  const facts = x.facts.filter((f): f is CalendarFact => !!f && typeof f.label === "string" && typeof f.value === "string" && !!f.value.trim());
  if (!facts.length) return null;
  return { title: String(x.title ?? ""), reckoned: String(x.reckoned ?? ""), facts, notes: Array.isArray(x.notes) ? x.notes.filter((n) => typeof n === "string") : [] };
}

const inputCls =
  "w-full rounded-xl border border-[#592209]/20 bg-white/80 px-4 py-3 text-base text-[#3B1E10] placeholder:text-[#3B1E10]/55 shadow-sm transition focus:border-[#B8892B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8892B]/50";
const labelCls = "mb-2 block text-sm font-semibold text-[#592209]";
const cardCls = "rounded-2xl border border-[#592209]/10 bg-white/75 p-5 shadow-[0_8px_30px_-18px_rgba(89,34,9,0.35)] sm:p-6";
const kicker = "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6414]";

export default function FutureLifePath() {
  useFeatureTitle(FEATURES.futurePath);
  const reduce = useReducedMotion();
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  // The place is chosen from a searchable list of real places, so it is spelled and identified correctly.
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [focus, setFocus] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false); // true when the request itself failed, so the same details can be sent again
  const [result, setResult] = useState<LifePathResult | null>(null);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Gentle entrance; with "reduce motion" the content simply appears. The request never waits for an animation.
  const enter = (delay = 0) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease: "easeOut" as const } };
  const hover = reduce ? {} : { whileHover: { y: -2 } };

  async function generate() {
    if (loading) return; // one request at a time
    setRetryable(false);
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (dob > today || dob < "1900-01-01") {
      setError("Please enter a valid date of birth.");
      return;
    }
    if (!requireSignIn(() => { void generate(); })) return; // signed out: ask first, keep the form
    setError("");
    setLoading(true);
    try {
      const res = await authedFetch(`${API_BASE_URL}/inner-voice/life-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob,
          tob: tob || undefined,
          pob: place?.label || undefined,
          // The coordinates and time zone of the chosen place decide the birth Panchang.
          place: place ? { latitude: place.latitude, longitude: place.longitude, timezone: place.timezone } : undefined,
          focus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Too many readings requested. Please wait a minute and try again.");
        return;
      }
      if (res.status === 503 && data?.code === "provider_busy") {
        // The service answered, but it is busy. Nothing was generated; the form keeps your details.
        setError("The reading service is busy right now. Your details are still here, so please try again in a minute.");
        setRetryable(true);
        return;
      }
      if (res.status === 400 && typeof data?.error === "string") {
        setError(data.error);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Request failed");
      if (!data || typeof data.lifePathOverview !== "string" || !data.lifePathOverview.trim() || typeof data.oneGoodStep !== "string" || !data.oneGoodStep.trim()) {
        throw new Error("Empty reading");
      }
      setResult(data);
    } catch (e) {
      if (e instanceof SignInRequiredError) {
        setError("Please sign in to generate your reading.");
        return;
      }
      console.error("[Future Life Path Prediction] request failed:", e);
      setError("We couldn't generate your reading right now. Please try again in a moment.");
      setRetryable(true);
    } finally {
      setLoading(false);
    }
  }

  const birth = cleanBlock(result?.panchang?.birth);
  const todayBlock = cleanBlock(result?.panchang?.today);
  const verse = result ? scriptureForFocus(focus) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#FBF5EC] via-[#FAF1E1] to-[#F4E2C0] px-4 pb-24 pt-24 text-[#3B1E10] sm:px-8">
      {/* Soft light and rings in the four corners; purely decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#E9C46A]/30 blur-3xl" />
        <div className="absolute -right-40 top-10 h-[26rem] w-[26rem] rounded-full bg-[#D9895F]/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#D9895F]/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#E9C46A]/30 blur-3xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute -left-24 top-40 rounded-full border border-[#B8892B]/20" style={{ width: 220 + i * 90, height: 220 + i * 90, marginLeft: -(i * 45), marginTop: -(i * 45) }} />
        ))}
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute -right-24 bottom-48 rounded-full border border-[#B8892B]/20" style={{ width: 220 + i * 90, height: 220 + i * 90, marginRight: -(i * 45), marginBottom: -(i * 45) }} />
        ))}
      </div>
      <div className="relative mx-auto max-w-6xl">
        <motion.header className="mb-8 text-center" {...enter()}>
          {/* The logo is a decorative tree on a white background; multiply blending lets the page colour show through the white. */}
          <img
            src="/images/tools/bhavishya-marg-logo.png"
            alt=""
            aria-hidden="true"
            width={118}
            height={96}
            className="mx-auto mb-2 h-20 w-auto select-none mix-blend-multiply sm:h-24"
            draggable={false}
          />
          <h1 className="mb-3 text-3xl leading-tight text-[#592209] sm:text-5xl" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {FEATURES.futurePath.name}
          </h1>
          {/* A quote in place of the two plain intro lines. The catalog subtitle itself (used elsewhere) is not changed. */}
          <blockquote data-testid="flp-quote" className="relative mx-auto mt-5 max-w-xl px-6 sm:px-10">
            <span aria-hidden="true" className="absolute -top-3 left-0 select-none font-serif text-6xl leading-none text-[#B8892B]/45">“</span>
            <p className="font-serif text-xl italic leading-relaxed text-[#592209] sm:text-2xl">
              Your path is never fixed in stone. Let the Panchang show you the moment, and let one calm step lead you forward.
            </p>
            <span aria-hidden="true" className="absolute -bottom-7 right-0 select-none font-serif text-6xl leading-none text-[#B8892B]/45">”</span>
            <footer className="mt-4 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-[#8A6414]">
              <span aria-hidden="true" className="h-px w-8 bg-[#B8892B]/50" />
              Panchang guidance
              <span aria-hidden="true" className="h-px w-8 bg-[#B8892B]/50" />
            </footer>
          </blockquote>
        </motion.header>

        <div className="mb-10" />

        {!result ? (
          <motion.div key="form" className="mx-auto max-w-4xl" {...enter(0.05)}>
            {loading && <FullScreenLoader title="Reading Your Path" description="Preparing your reading…" steps={["Calculating your Panchang", "Reading your path", "Writing your guidance"]} testId="futurepath-loader" />}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) generate();
              }}
              noValidate
              className="rounded-3xl border border-[#B8892B]/25 bg-gradient-to-br from-white/90 to-[#FFF7E8] p-5 shadow-[0_18px_50px_-28px_rgba(89,34,9,0.45)] sm:p-8"
              aria-busy={loading}
            >
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="flp-dob" className={labelCls}>
                    Date of birth <span className="font-bold text-[#8A6414]">(required)</span>
                  </label>
                  <input
                    id="flp-dob"
                    type="date"
                    required
                    min="1900-01-01"
                    max={today}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={inputCls}
                    aria-describedby={error ? "flp-error" : undefined}
                  />
                </div>
                <div>
                  <label htmlFor="flp-tob" className={labelCls}>
                    Time of birth <span className="font-normal text-[#3B1E10]/65">(optional)</span>
                  </label>
                  <input id="flp-tob" type="time" value={tob} onChange={(e) => setTob(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <span id="flp-pob-label" className={labelCls}>
                    Place of birth <span className="font-normal text-[#3B1E10]/65">(optional)</span>
                  </span>
                  <LocationPicker value={place} onSelect={setPlace} disabled={loading} />
                </div>
                <div className="md:col-span-3">
                  <span id="flp-focus-label" className={labelCls}>
                    Area of interest <span className="font-normal text-[#3B1E10]/65">(optional)</span>
                  </span>
                  <div role="radiogroup" aria-labelledby="flp-focus-label" className="flex flex-wrap gap-2">
                    {FOCUS_OPTIONS.map((o) => {
                      const on = focus === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setFocus(o.value)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8892B] ${
                            on
                              ? "border-[#592209] bg-[#592209] text-[#FBF1DC] shadow-md"
                              : "border-[#592209]/25 bg-white/70 text-[#592209] hover:border-[#B8892B] hover:bg-[#FFF3D6]"
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {error && (
                <div id="flp-error" role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-800">
                  ⚠ {error}
                  {!loading && dob && retryable && (
                    <button type="button" onClick={generate} className="ml-3 underline underline-offset-2 hover:text-foreground">
                      Retry
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#592209] to-[#7A3515] px-6 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[#FBF1DC] shadow-lg shadow-[#592209]/25 transition hover:from-[#6B2A0E] hover:to-[#8A3E1A] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8892B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Reading your path…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} aria-hidden="true" /> Generate My Life Path Reading
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-[#3B1E10]/65">Your details are sent only to generate this reading and are not saved.</p>
            </form>
          </motion.div>
        ) : (
          <div aria-live="polite">
            <motion.p className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.25em] text-[#8A6414]" {...enter()}>
              {FEATURES.futurePath.name}
            </motion.p>

            <div className="grid gap-5 lg:grid-cols-12">
              {/* Left: the calculated calendar, then the verified teaching */}
              <div className="space-y-5 lg:col-span-7">
                <motion.section data-testid="flp-panchang" aria-labelledby="flp-panchang-h" className={cardCls} {...enter(0.05)}>
                  <h2 id="flp-panchang-h" className={kicker}>
                    <Moon size={14} aria-hidden="true" /> Your Panchang
                  </h2>
                  {birth ? (
                    <CalendarCard block={birth} icon="moon" hover={hover} />
                  ) : (
                    <p className="rounded-xl border border-dashed border-[#B8892B]/50 bg-[#FFF8E6] px-4 py-3 text-sm text-[#4A2E1F]" data-testid="flp-no-birth-panchang">
                      {result.panchang?.birthNeedsPlace
                        ? "Your birth Panchang needs your place of birth, so it was not calculated. Choose a place from the list to see it. This reading is not based on your birth Panchang."
                        : "Your birth Panchang could not be calculated, so this reading is not Panchang-based."}
                    </p>
                  )}
                  {todayBlock && (
                    <div className="mt-5 border-t border-[#B8892B]/20 pt-4">
                      <CalendarCard block={todayBlock} icon="sun" hover={hover} />
                    </div>
                  )}
                  <p className="mt-3 text-xs text-[#3B1E10]/65">Calculated from the real positions of the Sun and Moon. Festivals are not included.</p>
                </motion.section>
              </div>

              {/* Right: what it means, guidance, one step, one thought */}
              <div className="space-y-5 lg:col-span-5">
                {result.meaning && (
                  <motion.section className={cardCls} {...enter(0.1)}>
                    <h2 className={kicker}>
                      <Info size={14} aria-hidden="true" /> What it means
                    </h2>
                    <p className="text-base leading-relaxed text-[#3B1E10]/90">{result.meaning}</p>
                  </motion.section>
                )}

                <motion.section className={cardCls} {...enter(0.15)}>
                  <h2 className={kicker}>
                    <Compass size={14} aria-hidden="true" /> Your Life Guidance <span className="font-normal normal-case tracking-normal text-[#3B1E10]/60">· {FOCUS_OPTIONS.find((o) => o.value === focus)?.label}</span>
                  </h2>
                  <p className="text-base leading-relaxed text-[#3B1E10]/90">{result.lifePathOverview}</p>
                </motion.section>

                <motion.section
                  className="rounded-2xl border border-[#B8892B]/50 bg-gradient-to-br from-[#FFF4D6] to-[#F8E3AE] p-5 shadow-[0_10px_34px_-18px_rgba(138,100,20,0.6)] sm:p-6"
                  {...enter(0.2)}
                >
                  <h2 className={kicker}>
                    <Lightbulb size={14} aria-hidden="true" /> One Good Step
                  </h2>
                  <p className="text-lg font-medium leading-relaxed text-[#592209]">{result.oneGoodStep}</p>
                </motion.section>

                {result.thought && (
                  <motion.section className="rounded-2xl border border-[#592209]/10 bg-white/60 px-5 py-4 text-center" {...enter(0.25)}>
                    <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6414]">A Thought to Remember</h2>
                    <p className="font-serif text-lg italic leading-relaxed text-[#592209]">“{result.thought}”</p>
                  </motion.section>
                )}
              </div>
          {/* A verified verse, kept apart from the calculation and from the guidance */}
          {verse && (
            <motion.section data-testid="flp-scripture" className={`${cardCls} lg:col-span-12`} {...enter(0.3)}>
              <h2 className={kicker}>
                <BookOpen size={14} aria-hidden="true" /> From the Bhagavad Gita
              </h2>
              <p className="text-base leading-relaxed text-[#3B1E10]/90">{verse.meaning}</p>
              <p className="mt-2 text-sm font-semibold text-[#592209]">Bhagavad Gita, {verse.reference}</p>
              <p className="mt-1 text-xs text-[#3B1E10]/60">A teaching for reflection. It is not part of the calculation.</p>
            </motion.section>
          )}
            </div>

            <div className="mx-auto mt-5 max-w-4xl">
              <AskDivyaSection feature="futurePath" context={[result.meaning, result.lifePathOverview, result.oneGoodStep].filter(Boolean).join("\n")} />
            </div>

            {error && (
              <div role="alert" className="mx-auto mt-4 max-w-4xl rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-800">
                ⚠ {error}
              </div>
            )}
          </div>
        )}
        <div className="mx-auto mt-10 max-w-3xl">
          <FeatureFaq feature="futurePath" />
        </div>
      </div>
    </div>
  );
}

/** One calendar (birth or today): a title, where it was reckoned, and small cards for each calculated fact. */
function CalendarCard({ block, icon, hover }: { block: CalendarBlock; icon: "moon" | "sun"; hover: object }) {
  const Icon = icon === "sun" ? Sun : Moon;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#592209]">
        <Icon size={15} aria-hidden="true" className="text-[#B8892B]" /> {block.title}
        <span className="text-xs font-normal text-[#3B1E10]/60">· {block.reckoned}</span>
      </p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {block.facts.map((f) => (
          <motion.div key={f.label} {...hover} className="rounded-xl border border-[#B8892B]/25 bg-gradient-to-br from-[#FFFBF0] to-[#FBEFD0] px-3 py-2.5 transition-shadow hover:shadow-md">
            <dt className="text-[11px] uppercase tracking-wider text-[#8A6414]">{f.label}</dt>
            <dd className="text-sm font-semibold text-[#592209]">{f.value}</dd>
          </motion.div>
        ))}
      </dl>
      {block.notes.map((n) => (
        <p key={n} className="mt-2 text-xs text-[#3B1E10]/65">{n}</p>
      ))}
    </div>
  );
}
