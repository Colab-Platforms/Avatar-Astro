import { useId, useState } from "react";
import RatnaImage from "./RatnaImage";
import { hindiLine, stoneLabel } from "./ratnaCatalog";
import { ordinal } from "./format";
import type { StoneAssessment } from "./types";

/** English name with the Hindi name and transliteration beneath it. */
export const StoneName = ({
  stone,
  as: Tag = "h3",
  className = "",
  hindiClassName = "",
  testId,
}: {
  stone: Pick<StoneAssessment["stone"], "key" | "name" | "hindi" | "sanskrit">;
  as?: "h2" | "h3" | "h4" | "p";
  className?: string;
  hindiClassName?: string;
  testId?: string;
}) => (
  <>
    <Tag className={className} data-testid={testId}>
      {stone.name}
    </Tag>
    <p className={hindiClassName} lang="hi" data-testid={testId ? `${testId}-hindi` : undefined}>
      {hindiLine(stone)}
    </p>
  </>
);

const houseKind = (h: number) => {
  const k: string[] = [];
  if ([1, 4, 7, 10].includes(h)) k.push("kendra");
  if ([1, 5, 9].includes(h)) k.push("trikona");
  if ([6, 8, 12].includes(h)) k.push("dusthana");
  return k.length ? ` (${k.join("/")})` : "";
};

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="min-w-0 rounded-lg border border-[#592209]/20 bg-[#FBF5EC] px-3 py-2">
    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{label}</p>
    <p className="mt-0.5 break-words text-[0.95rem] leading-snug text-[#301607]">{children}</p>
  </li>
);

/** The calculated facts about a Ratna's planet. Anything the engine did not compute reads "Not calculated". */
export const FactGrid = ({ a }: { a: StoneAssessment }) => {
  const p = a.profile;
  const motion = [p.retrograde && p.planet !== "Rahu" && p.planet !== "Ketu" ? "Retrograde" : null, p.combust ? "Combust (close to the Sun)" : null]
    .filter(Boolean)
    .join(", ");
  return (
    <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" aria-label={`${a.stone.name} planet details`}>
      <Cell label="Associated planet">{a.planet}</Cell>
      <Cell label="Planet's sign">{p.sign}</Cell>
      <Cell label="Planet's house">
        {ordinal(p.house)} house{houseKind(p.house)}
      </Cell>
      <Cell label="House lordship">
        {p.housesOwned.length ? `${p.housesOwned.map(ordinal).join(" and ")} house` : "Owns no sign"}
      </Cell>
      <Cell label="Nakshatra">
        {p.nakshatra}, pada {p.pada}
      </Cell>
      <Cell label="Dignity">{p.dignity === "not assessed" ? "Not assessed for the lunar nodes" : p.dignity}</Cell>
      {motion && <Cell label="Motion">{motion}</Cell>}
      <Cell label="Current dasha relevance">{a.dashaNote ?? "Not running now"}</Cell>
    </ul>
  );
};

/**
 * Compact consultation-style card for an alternative or cautioned Ratna.
 * "View Details" opens the chart-specific reasoning in place.
 */
const RatnaCard = ({ a, index = 0 }: { a: StoneAssessment; index?: number }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const caution = a.category === "caution";
  const planetRole = a.functional.houses.length
    ? `${a.planet}, lord of the ${a.functional.houses.map(ordinal).join(" and ")} house`
    : `${a.planet}, owns no sign`;
  return (
    <li
      data-testid={`ratna-card-${a.stone.key}`}
      data-category={a.category}
      className="ratna-lift ratna-reveal flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#592209]/25 bg-[#FBF5EC]"
      style={{ ["--i" as string]: Math.min(index, 5) } as React.CSSProperties}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5E9D6]">
        <RatnaImage stone={a.stone} className="!aspect-auto h-full w-full" />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
            caution ? "bg-[#FBF5EC] text-[#592209] ring-1 ring-[#E58A45]" : "bg-[#592209] text-[#F5E9D6]"
          }`}
        >
          {caution ? "Requires caution" : "Alternative Ratna"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <StoneName
          stone={a.stone}
          className="font-home-serif text-xl font-semibold leading-tight text-[#592209]"
          hindiClassName="text-base text-[#6B4A37]"
        />
        <p className="text-sm text-[#301607]">{planetRole}</p>
        <p className="text-sm leading-relaxed text-[#4A2E1F]">{a.reasons[0]}</p>
        <button
          type="button"
          className="ratna-btn-ghost mt-auto inline-flex items-center justify-center text-sm font-semibold"
          aria-expanded={open}
          aria-controls={`${id}-details`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide Details" : "View Details"}
        </button>
        {open && (
          <div id={`${id}-details`} className="space-y-3 border-t border-[#592209]/15 pt-3 text-sm text-[#4A2E1F]">
            <FactGrid a={a} />
            <div>
              <h4 className="font-semibold text-[#592209]">{caution ? "Why caution" : "Why this Ratna"}</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {a.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            {a.cautions.length > 0 && (
              <div>
                <h4 className="font-semibold text-[#592209]">Chart-specific concerns</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {a.cautions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <p>{a.stone.significance[0]}</p>
            <p className="text-xs text-[#6B4A37]">
              A traditional interpretation, not a guaranteed outcome. Please consult a qualified Vedic astrologer before
              acting on {stoneLabel(a.stone)}.
            </p>
          </div>
        )}
      </div>
    </li>
  );
};

export default RatnaCard;
