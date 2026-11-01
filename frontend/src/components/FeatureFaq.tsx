import { FEATURE_FAQS, type FaqKey } from "@/data/featureFaqs";

/** Standalone FAQ block for a feature page, styled like the education sections. Content lives in data/featureFaqs.ts. */
const FeatureFaq = ({ feature, className = "" }: { feature: FaqKey; className?: string }) => {
  const faqs = FEATURE_FAQS[feature];
  return (
    <section
      aria-labelledby={`${feature}-faq-title`}
      data-testid="feature-faq"
      className={`relative mx-auto w-full max-w-3xl px-4 pb-10 pt-6 text-left text-[#301607] ${className}`}
    >
      <article className="rounded-2xl border border-[#592209]/15 bg-[#FBF5EC] p-4 sm:p-6">
        <h2 id={`${feature}-faq-title`} className="mb-2 text-xl leading-snug text-[#592209] sm:text-2xl" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
          Frequently Asked Questions
        </h2>
        <div className="divide-y divide-[#592209]/15">
          {faqs.map((f) => (
            <details key={f.question} className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-[#301607] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209] [&::-webkit-details-marker]:hidden">
                <span>{f.question}</span>
                <span aria-hidden="true" className="mt-0.5 text-[#592209] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-1.5 text-base leading-[1.6] text-[#4A2E1F]">{f.answer}</p>
            </details>
          ))}
        </div>
      </article>
    </section>
  );
};

export default FeatureFaq;
