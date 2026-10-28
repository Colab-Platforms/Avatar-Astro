interface Step {
  title: string;
  text: string;
}

interface FeatureIntroProps {
  /** Short description shown under the page title. */
  description: string;
  steps: Step[];
  /** Optional interpretive-guidance disclaimer shown under the steps. */
  disclaimer?: string;
  className?: string;
}

/**
 * Shared "what this tool does + How It Works" block used on the four
 * Inner Voice / Destiny feature pages so they read as one family.
 */
export default function FeatureIntro({ description, steps, disclaimer, className = "" }: FeatureIntroProps) {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className={`mx-auto w-full max-w-3xl px-4 text-center ${className}`}
    >
      <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{description}</p>

      <h2
        id="how-it-works-heading"
        className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#D9895F]"
        style={{ fontFamily: "'Astra','Iceland',sans-serif" }}
      >
        How It Works
      </h2>
      <ol className="grid gap-3 text-left sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#BC6A4D]/50 bg-[#BC6A4D]/10 text-sm text-[#D9895F]"
              >
                {i + 1}
              </span>
              <h3 className="text-sm font-semibold text-white">{s.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/65">{s.text}</p>
          </li>
        ))}
      </ol>

      {disclaimer && <p className="mt-5 text-xs italic leading-relaxed text-white/50">{disclaimer}</p>}
    </section>
  );
}
