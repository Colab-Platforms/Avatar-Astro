import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGlossary } from "@/i18n/glossary";
import type { HouseInfo, KundaliResult } from "./types";

// North Indian style chart (diamond layout) drawn from the CALCULATED chart. The 1st house is always the top centre diamond and
// houses run anticlockwise; the sign number inside each house is the sign that falls in that house. Nothing is invented: it
// only places the grahas the server already calculated.
//
// Each house is also a button: hovering (or focusing) shows what the house means and what this chart has in it, and tapping or
// pressing it keeps that card open. The lord, occupants and aspects shown come from the server's `houses` data for THIS chart
// (D1 or D9); only the traditional house meanings are fixed text.

// Graha names as written in the chart: the Sanskrit/Hindi name (the English name is given in the text under the chart).
const GRAHA_NAME: Record<string, string> = { Sun: "Surya", Moon: "Chandra", Mars: "Mangal", Mercury: "Budh", Jupiter: "Guru", Venus: "Shukra", Saturn: "Shani", Rahu: "Rahu", Ketu: "Ketu" };
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

// Text anchor (centre) of each house in a 400x400 viewBox, houses 1..12.
const CENTRES: [number, number][] = [
  [200, 95], [100, 40], [40, 100], [100, 200], [40, 300], [100, 360],
  [200, 305], [300, 360], [360, 300], [300, 200], [360, 100], [300, 40],
];
const SIGN_NUM_POS: [number, number][] = [
  [200, 150], [100, 70], [70, 100], [150, 200], [70, 300], [100, 330],
  [200, 250], [300, 330], [330, 300], [250, 200], [330, 100], [300, 70],
];
// The region of each house (the same twelve areas the lines of the chart enclose), houses 1..12.
const REGIONS: string[] = [
  "200,2 299,101 200,200 101,101",
  "2,2 200,2 101,101",
  "2,2 101,101 2,200",
  "2,200 101,101 200,200 101,299",
  "2,200 101,299 2,398",
  "2,398 101,299 200,398",
  "200,398 101,299 200,200 299,299",
  "200,398 299,299 398,398",
  "398,398 299,299 398,200",
  "398,200 299,299 200,200 299,101",
  "398,200 299,101 398,2",
  "398,2 299,101 200,2",
];

interface Props {
  title: string;
  /** Lagna sign (English name) for this chart. */
  lagnaSign: string;
  grahas: { planet: string; sign: string; house: number }[];
  /** The calculated details of each house of THIS chart. Without them the card says the lord and aspects are unavailable. */
  houses?: HouseInfo[] | null;
  testId?: string;
}

export const BirthChartDiagram = ({ title, lagnaSign, grahas, houses, testId }: Props) => {
  const { t } = useTranslation();
  const { g } = useGlossary();
  const uid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const figureRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const grahaName = (planet: string) => t(`birthChart.graha.${planet}`, { defaultValue: GRAHA_NAME[planet] ?? planet });
  const grahaFull = (planet: string) => (grahaName(planet) === g("planet", planet) ? grahaName(planet) : `${grahaName(planet)} (${g("planet", planet)})`);
  const lagnaIdx = SIGNS.indexOf(lagnaSign);
  const byHouse = new Map<number, string[]>();
  for (const gr of grahas) byHouse.set(gr.house, [...(byHouse.get(gr.house) ?? []), grahaName(gr.planet)]);
  const label = grahas.map((gr) => t("birthChart.diagram.grahaInHouse", { name: grahaName(gr.planet), planet: g("planet", gr.planet), house: gr.house })).join(", ");

  const active = pinned ?? hover;

  // A tap or click elsewhere, or Escape, puts a kept-open card away.
  useEffect(() => {
    if (pinned === null) return;
    const away = (e: Event) => {
      const el = e.target as Element;
      if (!figureRef.current?.contains(el) && !el.closest?.("[data-house-card]")) setPinned(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPinned(null); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [pinned]);

  const info = (house: number): HouseInfo | undefined => houses?.find((h) => h.house === house);

  return (
    <figure ref={figureRef} className="m-0 min-w-0" data-testid={testId}>
      <div ref={boxRef} className="relative w-full max-w-[420px]" onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 400 400" role="group" aria-label={t("birthChart.diagram.aria", { title, lagna: g("rashi", lagnaSign), label })} className="block h-auto w-full">
          <rect x="2" y="2" width="396" height="396" fill="#FBF5EC" stroke="#592209" strokeWidth="2" />
          {/* The clickable areas sit under the lines and labels so the chart looks exactly as before. */}
          {REGIONS.map((points, i) => {
            const house = i + 1;
            const on = active === house;
            const sign = SIGNS[(lagnaIdx + i) % 12];
            return (
              <polygon
                key={house}
                points={points}
                role="button"
                tabIndex={0}
                aria-pressed={pinned === house}
                aria-expanded={active === house}
                aria-controls={active === house ? `${uid}-card` : undefined}
                aria-label={t("birthChart.houseTip.title", { n: house, name: t(`birthChart.houses.${house}.name`) }) + (lagnaIdx >= 0 ? `, ${g("rashi", sign)}` : "")}
                data-house={house}
                fill={on ? "#C18A3D" : "transparent"}
                fillOpacity={on ? (pinned === house ? 0.3 : 0.18) : 0}
                stroke={pinned === house ? "#C18A3D" : "none"}
                strokeWidth={pinned === house ? 4 : 0}
                strokeLinejoin="round"
                className="cursor-pointer outline-none focus-visible:[stroke:#803003] focus-visible:[stroke-width:4px]"
                onMouseEnter={() => setHover(house)}
                onFocus={() => setHover(house)}
                onBlur={() => setHover((h) => (h === house ? null : h))}
                onClick={() => setPinned((p) => (p === house ? null : house))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned((p) => (p === house ? null : house)); }
                }}
              />
            );
          })}
          <path d="M2 2 L398 398 M398 2 L2 398 M200 2 L398 200 L200 398 L2 200 Z" fill="none" stroke="#592209" strokeWidth="1.5" pointerEvents="none" />
          {CENTRES.map(([x, y], i) => {
            const house = i + 1;
            const signNum = ((lagnaIdx + i) % 12) + 1;
            const ps = byHouse.get(house) ?? [];
            const [sx, sy] = SIGN_NUM_POS[i];
            const small = ps.length > 3;
            return (
              <g key={house} pointerEvents="none">
                <text x={sx} y={sy} textAnchor="middle" fontSize="13" fill="#6B4A37">{signNum}</text>
                {ps.map((p, j) => (
                  <text key={p} x={x} y={y + (j - (ps.length - 1) / 2) * (small ? 13 : 16)} textAnchor="middle" fontSize={small ? 11 : 13} fontWeight="700" fill="#301607">{p}</text>
                ))}
              </g>
            );
          })}
        </svg>

        {active !== null && (
          <HouseCard
            id={`${uid}-card`}
            anchor={boxRef}
            house={active}
            info={info(active)}
            sign={lagnaIdx >= 0 ? SIGNS[(lagnaIdx + active - 1) % 12] : null}
            occupants={grahas.filter((gr) => gr.house === active).map((gr) => gr.planet)}
            pinned={pinned === active}
            onClose={() => setPinned(null)}
            grahaFull={grahaFull}
            rashi={(s) => g("rashi", s)}
          />
        )}
      </div>
      <figcaption className="mt-1 text-center text-sm font-semibold text-[#592209]">{title}</figcaption>
      <p className="mt-1 text-center text-xs text-[#6B4A37]">{t("birthChart.houseTip.hint")}</p>
      {houses && <p className="mt-1 text-center text-[11px] leading-snug text-[#6B4A37]" data-testid="aspect-convention">{t("birthChart.houseTip.convention")}</p>}
    </figure>
  );
};

interface CardProps {
  id: string;
  anchor: React.RefObject<HTMLElement>;
  house: number;
  info: HouseInfo | undefined;
  sign: string | null;
  occupants: string[];
  pinned: boolean;
  onClose: () => void;
  grahaFull: (p: string) => string;
  rashi: (s: string) => string;
}

// The card floats over the page (fixed, in the body), so it is never clipped by the chart's container or the page: beside the chart
// on wide screens, and a bottom sheet on phones. A card that is only hovered ignores the pointer, so it cannot flicker.
const CARD_W = 340;
const CARD_MAX_H = 620;
function cardPlacement(box: HTMLElement | null): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640 || !box) return { position: "fixed", left: 8, right: 8, bottom: 8, maxHeight: "62vh" };
  const r = box.getBoundingClientRect();
  const room = { right: vw - r.right - 12, left: r.left - 12 };
  const left = room.right >= CARD_W ? r.right + 12 : room.left >= CARD_W ? r.left - 12 - CARD_W : Math.max(8, Math.min(r.left + 24, vw - CARD_W - 8));
  const top = Math.max(8, Math.min(r.top, vh - Math.min(CARD_MAX_H, vh - 16) - 8));
  return { position: "fixed", left, top, width: CARD_W, maxHeight: Math.min(CARD_MAX_H, vh - 16) };
}

const HouseCard = ({ id, anchor, house, info, sign, occupants, pinned, onClose, grahaFull, rashi }: CardProps) => {
  const { t } = useTranslation();
  const shownSign = info?.sign ?? sign;
  const planets = info?.planets ?? occupants;
  const aspects = info?.aspectedBy ?? null;
  const [place, setPlace] = useState<CSSProperties>({ position: "fixed", visibility: "hidden" });
  useLayoutEffect(() => {
    const update = () => setPlace(cardPlacement(anchor.current));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [anchor, house]);

  return createPortal(
    <div
      id={id}
      data-house-card
      role="dialog"
      aria-label={t("birthChart.houseTip.title", { n: house, name: t(`birthChart.houses.${house}.name`) })}
      data-testid="house-card"
      data-house={house}
      className={`z-50 overflow-y-auto rounded-xl border border-[#C18A3D] bg-[#FFFBF3] p-3 text-left text-[13px] leading-snug text-[#33251D] shadow-lg ${pinned ? "" : "pointer-events-none"}`}
      style={place}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wide text-[#54230F]">{t("birthChart.houseTip.title", { n: house, name: t(`birthChart.houses.${house}.name`) })}</h4>
        {pinned && (
          <button type="button" onClick={onClose} aria-label={t("birthChart.houseTip.close")} className="-mr-1 -mt-1 rounded p-1 text-[#6B4A37] hover:bg-[#F5E9D6]"><X className="h-4 w-4" /></button>
        )}
      </div>

      <Row label={t("birthChart.houseTip.lifeAreas")}>{t(`birthChart.houses.${house}.areas`)}</Row>
      {shownSign && <Row label={t("birthChart.houseTip.sign")}>{rashi(shownSign)}</Row>}

      {info ? (
        <>
          <Row label={t("birthChart.houseTip.lord")}>{t("birthChart.houseTip.lordIn", { lord: grahaFull(info.lord), house: info.lordPlacement.house, sign: rashi(info.lordPlacement.sign) })}</Row>
          <Row label={t("birthChart.houseTip.occupants")}>{planets.length ? planets.map(grahaFull).join(", ") : t("birthChart.houseTip.none")}</Row>
          <Row label={t("birthChart.houseTip.aspects")}>
            {aspects && aspects.length ? (
              <ul className="m-0 list-disc pl-4">
                {aspects.map((a) => <li key={a.planet}>{t("birthChart.houseTip.aspectLine", { planet: grahaFull(a.planet), from: a.fromHouse, n: a.aspect })}</li>)}
              </ul>
            ) : t("birthChart.houseTip.noAspects")}
          </Row>
          <Row label={t("birthChart.houseTip.meaning")}>{t(`birthChart.houses.${house}.meaning`)}</Row>
          <Row label={t("birthChart.houseTip.thisChart")}>
            {t("birthChart.houseTip.summary", {
              n: house,
              sign: rashi(info.sign),
              lord: grahaFull(info.lord),
              lordHouse: info.lordPlacement.house,
              occupants: planets.length ? t("birthChart.houseTip.summaryOccupied", { planets: planets.map(grahaFull).join(", ") }) : t("birthChart.houseTip.summaryEmpty"),
              aspects: aspects && aspects.length ? t("birthChart.houseTip.summaryAspected", { planets: aspects.map((a) => grahaFull(a.planet)).join(", ") }) : t("birthChart.houseTip.summaryNoAspects"),
            })}
          </Row>
        </>
      ) : (
        <>
          <Row label={t("birthChart.houseTip.occupants")}>{planets.length ? planets.map(grahaFull).join(", ") : t("birthChart.houseTip.none")}</Row>
          <Row label={t("birthChart.houseTip.meaning")}>{t(`birthChart.houses.${house}.meaning`)}</Row>
          <p className="m-0 mt-1 text-[12px] text-[#6B4A37]">{t("birthChart.houseTip.unavailable")}</p>
        </>
      )}
    </div>,
    document.body,
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-1.5">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#803003]">{label}</div>
    <div>{children}</div>
  </div>
);

export const D1Chart = ({ k }: { k: KundaliResult }) => {
  const { t } = useTranslation();
  return k.lagna && k.planets ? (
    <BirthChartDiagram testId="chart-d1" title={t("birthChart.diagram.d1")} lagnaSign={k.lagna.rashi.sign} houses={k.houses?.d1} grahas={k.planets.map((p) => ({ planet: p.planet, sign: p.rashi.sign, house: p.house }))} />
  ) : null;
};

export const D9Chart = ({ k }: { k: KundaliResult }) => {
  const { t } = useTranslation();
  return k.navamsa ? (
    <BirthChartDiagram testId="chart-d9" title={t("birthChart.diagram.d9")} lagnaSign={k.navamsa.lagna.sign} houses={k.houses?.d9} grahas={k.navamsa.planets.map((p) => ({ planet: p.planet, sign: p.rashi.sign, house: p.house }))} />
  ) : null;
};

export default BirthChartDiagram;
