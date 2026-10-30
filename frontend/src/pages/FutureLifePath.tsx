import { useState } from "react";
import FullScreenLoader from "@/components/Loader/FullScreenLoader";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { Link } from "react-router-dom";
import { Compass, RotateCcw, Pencil, Loader2 } from "lucide-react";
import FeatureIntro from "@/components/FeatureIntro";
import { API_BASE_URL } from "@/lib/api";
import { authedFetch, SignInRequiredError } from "@/lib/authedFetch";

const FOCUS_OPTIONS = [
  { value: "general", label: "General life direction" },
  { value: "career", label: "Career and professional growth" },
  { value: "relationships", label: "Relationships" },
  { value: "personal-growth", label: "Personal development" },
  { value: "finance", label: "Financial habits and goals" },
];

interface LifePathResult {
  lifePathOverview?: string;
  careerAndGrowth?: string;
  relationships?: string;
  personalDevelopment?: string;
  focusInsight?: string;
  upcomingPeriods?: { period: string; theme: string }[];
  nextSteps?: string[];
  reflectionQuestions?: string[];
}

const SECTIONS: { key: keyof LifePathResult; title: string }[] = [
  { key: "lifePathOverview", title: "Life Path Overview" },
  { key: "careerAndGrowth", title: "Career and Growth" },
  { key: "relationships", title: "Relationships" },
  { key: "personalDevelopment", title: "Personal Development" },
];

const inputCls =
  "w-full rounded-xl border border-primary/25 bg-card px-4 py-3 text-base text-foreground placeholder:text-foreground/70 focus:border-[#592209] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#592209]/50";
const labelCls = "mb-2 block text-sm font-semibold text-[#592209]";

export default function FutureLifePath() {
  useFeatureTitle(FEATURES.futurePath);
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pob, setPob] = useState("");
  const [focus, setFocus] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LifePathResult | null>(null);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  async function generate() {
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (dob > today || dob < "1900-01-01") {
      setError("Please enter a valid date of birth.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authedFetch(`${API_BASE_URL}/inner-voice/life-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob, tob: tob || undefined, pob: pob.trim() || undefined, focus }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Too many readings requested. Please wait a minute and try again.");
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Request failed");
      if (!data || !data.lifePathOverview) throw new Error("Empty reading");
      setResult(data);
    } catch (e) {
      if (e instanceof SignInRequiredError) {
        setError("Please sign in to generate your reading.");
        return;
      }
      console.error("[Future Life Path Prediction] request failed:", e);
      setError("We couldn't generate your reading right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF5EC] px-4 pb-24 pt-24 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <Compass aria-hidden="true" className="mx-auto mb-3 text-[#592209]" size={36} />
          <h1
            className="mb-4 text-3xl leading-tight text-[#592209] sm:text-5xl"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            {FEATURES.futurePath.name}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#4A2E1F] sm:text-lg">{FEATURES.futurePath.subtitle}</p>
        </header>

        <FeatureIntro
          className="mb-10"
          description="Explore possible directions for your future through personalized astrological insights. Bhavishya Marg helps you reflect on potential opportunities, personal growth, relationships, career themes, and important life decisions through the lens of astrology."
          steps={[
            { title: "Enter Details", text: "Add your date of birth. Time, place and an area of interest are optional." },
            { title: "Generate Your Reading", text: "A life path interpretation is written for you from the details you provide." },
            { title: "Explore Your Insights", text: "Read each section and use the reflection questions to think through your next steps." },
          ]}
          disclaimer="This is interpretive guidance, not certain knowledge of the future. Readings are AI-written interpretations and do not include a computed birth chart. Please don't treat them as medical, legal or financial advice."
        />

        {!result ? (
          <>
          {loading && <FullScreenLoader title="Reading Your Path" description="Preparing your life path reading…" steps={["Reading your birth details", "Exploring possible paths", "Preparing your reading"]} testId="futurepath-loader" />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) generate();
            }}
            noValidate
            className="rounded-3xl border border-primary/15 bg-card p-5 sm:p-8"
            aria-busy={loading}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="flp-dob" className={labelCls}>
                  Date of birth <span className="text-[#592209]">(required)</span>
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
                  Time of birth <span className="font-normal text-foreground/70">(optional)</span>
                </label>
                <input id="flp-tob" type="time" value={tob} onChange={(e) => setTob(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="flp-pob" className={labelCls}>
                  Place of birth <span className="font-normal text-foreground/70">(optional)</span>
                </label>
                <input
                  id="flp-pob"
                  type="text"
                  maxLength={100}
                  value={pob}
                  onChange={(e) => setPob(e.target.value)}
                  placeholder="City, country"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="flp-focus" className={labelCls}>
                  Area of interest <span className="font-normal text-foreground/70">(optional)</span>
                </label>
                <select id="flp-focus" value={focus} onChange={(e) => setFocus(e.target.value)} className={inputCls}>
                  {FOCUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#FBF5EC]">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div
                id="flp-error"
                role="alert"
                className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-800"
              >
                ⚠ {error}
                {!loading && dob && error.startsWith("We couldn't") && (
                  <button type="button" onClick={generate} className="ml-3 underline underline-offset-2 hover:text-foreground">
                    Retry
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#592209] px-6 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[#F5E9D6] transition hover:bg-[#592209] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Reading your path…
                </>
              ) : (
                "Generate My Life Path Reading"
              )}
            </button>
            <p className="mt-3 text-center text-xs text-foreground/70">
              Your details are sent only to generate this reading and are not saved.
            </p>
          </form>
          </>
        ) : (
          <div className="space-y-4" aria-live="polite">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-[#592209]">{FEATURES.futurePath.name}</p>
            {SECTIONS.map(({ key, title }) =>
              result[key] ? (
                <section key={key} className="rounded-2xl border border-primary/15 bg-card p-5 sm:p-6">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#592209]">{title}</h2>
                  <p className="text-base leading-relaxed text-foreground/85">{result[key] as string}</p>
                </section>
              ) : null,
            )}

            {result.focusInsight && (
              <section className="rounded-2xl border border-[#592209]/30 bg-[#592209]/[0.07] p-5 sm:p-6">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#592209]">
                  Your Focus: {FOCUS_OPTIONS.find((o) => o.value === focus)?.label}
                </h2>
                <p className="text-base leading-relaxed text-foreground/90">{result.focusInsight}</p>
              </section>
            )}

            {!!result.nextSteps?.length && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#D9895F]">Practical Next Steps</h2>
                <ul className="list-disc space-y-2 pl-5 text-base text-white/85">
                  {result.nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {!!result.upcomingPeriods?.length && (
              <section className="rounded-2xl border border-primary/15 bg-card p-5 sm:p-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#592209]">Upcoming Periods</h2>
                <ul className="space-y-3">
                  {result.upcomingPeriods.map((p, i) => (
                    <li key={i} className="text-base leading-relaxed text-foreground/85">
                      <span className="font-semibold text-foreground">{p.period}: </span>
                      {p.theme}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!!result.reflectionQuestions?.length && (
              <section className="rounded-2xl border border-primary/15 bg-card p-5 sm:p-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#592209]">Questions to Reflect On</h2>
                <ul className="list-disc space-y-2 pl-5 text-base text-foreground/80">
                  {result.reflectionQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </section>
            )}

            <p className="px-2 text-center text-xs text-white/60">
              Based on: your date of birth{tob ? ", time of birth" : ""}
              {pob.trim() ? ", place of birth" : ""}. {!tob || !pob.trim() ? "Without a birth time and place, an ascendant or house-based reading is not possible, so this stays general. " : ""}
              No birth chart was calculated.
            </p>
            <p className="px-2 text-center text-xs italic text-foreground/70">
              This reading is interpretive guidance for reflection, not a prediction of certain outcomes.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#592209]/40 px-5 py-3 text-sm uppercase tracking-widest text-[#D9895F] hover:bg-[#592209]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209]"
              >
                <Pencil size={16} aria-hidden="true" /> Edit Details
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/25 px-5 py-3 text-sm uppercase tracking-widest text-foreground/70 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
                Regenerate
              </button>
            </div>
            {error && (
              <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-800">
                ⚠ {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
