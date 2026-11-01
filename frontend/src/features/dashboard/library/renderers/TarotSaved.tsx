import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip } from "../ui";
import { StructuredView } from "../ReadingView";

/**
 * Tarot, shaped like the live result: the spread (each card with its position and meaning), the overall message, then the
 * guidance sections. Works for both modes (life timeline: 5 cards, karma: 3 cards). Any field not placed here is still shown below.
 */
type Insight = { position?: string; card?: string; insight?: string };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

const LEAD = [["currentLifeStage", "Current life stage"], ["rootCause", "Root cause"], ["overallMessage", "Overall message"]] as const;
const GUIDE = [
  ["mainOpportunity", "Main opportunity"], ["hiddenChallenge", "Hidden challenge"], ["nextMajorTurningPoint", "Next major turning point"], ["recommendedAction", "Recommended action"],
  ["spiritualGuidance", "Spiritual guidance"], ["dailyAction", "Daily action"], ["weeklyAction", "Weekly action"], ["spiritualPractice", "Spiritual practice"], ["recommendedHabit", "Recommended habit"],
] as const;
const CLOSING = [["reflectionQuestion", "Reflection question"], ["positiveAffirmation", "Positive affirmation"]] as const;

export const isTarotOutput = (o: unknown): o is Record<string, unknown> =>
  isObj(o) && (Array.isArray(o.timelineNarrative) || Array.isArray(o.cardInsights));

export default function TarotSaved({ output }: { output: Record<string, unknown> }) {
  const spread = (Array.isArray(output.timelineNarrative) ? output.timelineNarrative : Array.isArray(output.cardInsights) ? output.cardInsights : []) as Insight[];
  const used = new Set<string>(["timelineNarrative", "cardInsights", "lifeAreasAffected", ...LEAD.map(([k]) => k), ...GUIDE.map(([k]) => k), ...CLOSING.map(([k]) => k)]);
  const rest = Object.fromEntries(Object.entries(output).filter(([k]) => !used.has(k)));
  const areas = Array.isArray(output.lifeAreasAffected) ? (output.lifeAreasAffected as unknown[]).filter((a): a is string => typeof a === "string") : [];
  const box = "rounded-2xl border border-[#E9DDC9] bg-white/70 p-5";
  return (
    <div data-testid="reading-output" className="space-y-5">
      {spread.length > 0 && (
        <section aria-label="Your spread">
          <ol className={cn("grid grid-cols-1 gap-3", spread.length >= 5 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-3")}>
            {spread.map((c, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-2xl border border-[#D9C28F] bg-gradient-to-b from-[#FFFDF8] to-[#F7ECD3] p-4">
                <div className="flex items-center gap-3">
                  <IconChip icon={Sparkles} tone="gold" size="sm" />
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#A8803A]">{text(c.position) ?? `Card ${i + 1}`}</p>
                    <p className="truncate font-home-serif text-base font-semibold text-[#2A1A10]">{text(c.card) ?? "—"}</p>
                  </div>
                </div>
                {text(c.insight) && <p className="text-sm leading-relaxed text-[#4A3A2C]">{c.insight}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
      {LEAD.map(([k, label]) => text(output[k]) && (
        <section key={k} className="rounded-2xl border border-[#D9C28F] bg-gradient-to-br from-[#FFFDF8] to-[#F7ECD3] p-5">
          <h3 className="mb-1.5 font-home-serif text-base font-semibold text-[#2A1A10]">{label}</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#4A3A2C]">{output[k] as string}</p>
        </section>
      ))}
      {areas.length > 0 && (
        <section className={box}>
          <h3 className="mb-2 font-home-serif text-base font-semibold text-[#2A1A10]">Life areas affected</h3>
          <ul className="flex flex-wrap gap-2">{areas.map((a) => <li key={a} className="rounded-full bg-[#F3E8D4] px-3 py-1 text-xs font-medium text-[#6B4A12]">{a}</li>)}</ul>
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {GUIDE.map(([k, label]) => text(output[k]) && (
          <section key={k} className={box}>
            <h3 className="mb-1.5 font-home-serif text-base font-semibold text-[#2A1A10]">{label}</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#4A3A2C]">{output[k] as string}</p>
          </section>
        ))}
      </div>
      {CLOSING.map(([k, label]) => text(output[k]) && (
        <section key={k} className="rounded-2xl border border-[#E9DDC9] bg-[#FBF6EA] p-5">
          <h3 className="mb-1.5 font-home-serif text-base font-semibold text-[#2A1A10]">{label}</h3>
          <p className="whitespace-pre-line text-sm italic leading-relaxed text-[#4A3A2C]">{output[k] as string}</p>
        </section>
      ))}
      {Object.keys(rest).length > 0 && <StructuredView output={rest} />}
    </div>
  );
}
