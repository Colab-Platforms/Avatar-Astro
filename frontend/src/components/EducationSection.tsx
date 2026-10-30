import type { ReactNode } from "react";

export interface EducationBlock {
  heading: string;
  /** Plain paragraphs, shown in order. */
  paragraphs?: string[];
  /** Bulleted (or numbered, when `ordered`) list shown after the paragraphs. */
  list?: ReactNode[];
  ordered?: boolean;
  /** Optional small table (e.g. a letter-to-number mapping). */
  table?: { head: string[]; rows: string[][]; caption?: string };
  /** Paragraphs shown after the list/table. */
  after?: string[];
}

export interface EducationFaq {
  question: string;
  answer: string;
}

interface EducationSectionProps {
  /** Used for the section's accessible name and as the eyebrow label, e.g. "About Tarot Experience". */
  title: string;
  blocks: EducationBlock[];
  faqs?: EducationFaq[];
  disclaimer: string;
  /** Prefix for generated element ids; must be unique per page. */
  idPrefix: string;
}

/**
 * Shared "learn more" block rendered BELOW a tool. The tool stays the primary
 * experience; this explains what it is, how results are produced and how to
 * read them. Content is supplied by each tool so it can describe that tool's
 * real method.
 */
export default function EducationSection({ title, blocks, faqs, disclaimer, idPrefix }: EducationSectionProps) {
  return (
    <section
      aria-labelledby={`${idPrefix}-edu-title`}
      data-testid="education-section"
      className="relative mx-auto w-full max-w-3xl px-4 pb-24 pt-16 text-left text-[#301607]"
    >
      <div className="mb-10 text-center">
        <p
          id={`${idPrefix}-edu-title`}
          className="text-xs font-semibold uppercase tracking-[0.3em] text-[#592209]"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
        >
          {title}
        </p>
        <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[#592209] to-transparent" />
      </div>

      <div className="space-y-6">
        {blocks.map((b, i) => (
          <article key={b.heading} className="rounded-2xl border border-[#592209]/10 bg-white/[0.04] p-5 sm:p-7">
            <h2
              className="mb-3 text-xl leading-snug text-[#592209] sm:text-2xl"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              <span aria-hidden="true" className="mr-2 text-[#592209]/70">
                {i + 1}.
              </span>
              {b.heading}
            </h2>
            <div className="space-y-3 text-base leading-relaxed text-[#4A2E1F]">
              {b.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {b.list &&
                (b.ordered ? (
                  <ol className="list-decimal space-y-2 pl-6 marker:text-[#592209]">
                    {b.list.map((li, j) => (
                      <li key={j}>{li}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className="list-disc space-y-2 pl-6 marker:text-[#592209]">
                    {b.list.map((li, j) => (
                      <li key={j}>{li}</li>
                    ))}
                  </ul>
                ))}
              {b.table && (
                <div className="overflow-x-auto rounded-xl border border-[#592209]/10">
                  <table className="w-full min-w-[320px] border-collapse text-center text-sm">
                    {b.table.caption && <caption className="p-2 text-xs text-[#6B4A37]">{b.table.caption}</caption>}
                    <thead>
                      <tr className="bg-[#592209]/10 text-[#592209]">
                        {b.table.head.map((h) => (
                          <th key={h} scope="col" className="border-b border-[#592209]/10 px-3 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.table.rows.map((r, ri) => (
                        <tr key={ri} className="odd:bg-white/[0.02]">
                          {r.map((c, ci) => (
                            <td key={ci} className="border-b border-[#592209]/10 px-3 py-2 text-[#4A2E1F]">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {b.after?.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </article>
        ))}

        {!!faqs?.length && (
          <article className="rounded-2xl border border-[#592209]/10 bg-white/[0.04] p-5 sm:p-7">
            <h2
              className="mb-3 text-xl leading-snug text-[#592209] sm:text-2xl"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              <span aria-hidden="true" className="mr-2 text-[#592209]/70">
                {blocks.length + 1}.
              </span>
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-white/10">
              {faqs.map((f) => (
                <details key={f.question} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-[#301607] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209] [&::-webkit-details-marker]:hidden">
                    <span>{f.question}</span>
                    <span aria-hidden="true" className="mt-0.5 text-[#592209] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-base leading-relaxed text-[#4A2E1F]">{f.answer}</p>
                </details>
              ))}
            </div>
          </article>
        )}
      </div>

      <p className="mt-8 px-2 text-center text-sm italic leading-relaxed text-[#6B4A37]">{disclaimer}</p>
    </section>
  );
}
