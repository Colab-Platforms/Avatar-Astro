import { useTranslation } from "react-i18next";
import { useGlossary } from "@/i18n/glossary";
import type { KundaliResult } from "./types";

// North Indian style chart (diamond layout) drawn from the CALCULATED chart. The 1st house is always the top centre diamond and
// houses run anticlockwise; the sign number inside each house is the sign that falls in that house. Nothing is invented: it
// only places the grahas the server already calculated.

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

interface Props {
  title: string;
  /** Lagna sign (English name) for this chart. */
  lagnaSign: string;
  grahas: { planet: string; sign: string; house: number }[];
  testId?: string;
}

export const BirthChartDiagram = ({ title, lagnaSign, grahas, testId }: Props) => {
  const { t } = useTranslation();
  const { g } = useGlossary();
  const grahaName = (planet: string) => t(`birthChart.graha.${planet}`, { defaultValue: GRAHA_NAME[planet] ?? planet });
  const lagnaIdx = SIGNS.indexOf(lagnaSign);
  const byHouse = new Map<number, string[]>();
  for (const gr of grahas) byHouse.set(gr.house, [...(byHouse.get(gr.house) ?? []), grahaName(gr.planet)]);
  const label = grahas.map((gr) => t("birthChart.diagram.grahaInHouse", { name: grahaName(gr.planet), planet: g("planet", gr.planet), house: gr.house })).join(", ");
  return (
    <figure className="m-0 min-w-0" data-testid={testId}>
      <svg viewBox="0 0 400 400" role="img" aria-label={t("birthChart.diagram.aria", { title, lagna: g("rashi", lagnaSign), label })} className="h-auto w-full max-w-[420px]">
        <rect x="2" y="2" width="396" height="396" fill="#FBF5EC" stroke="#592209" strokeWidth="2" />
        <path d="M2 2 L398 398 M398 2 L2 398 M200 2 L398 200 L200 398 L2 200 Z" fill="none" stroke="#592209" strokeWidth="1.5" />
        {CENTRES.map(([x, y], i) => {
          const house = i + 1;
          const signNum = ((lagnaIdx + i) % 12) + 1;
          const ps = byHouse.get(house) ?? [];
          const [sx, sy] = SIGN_NUM_POS[i];
          return (
            <g key={house}>
              <text x={sx} y={sy} textAnchor="middle" fontSize="13" fill="#6B4A37">{signNum}</text>
              {ps.map((p, j) => (
                <text key={p} x={x} y={y + (j - (ps.length - 1) / 2) * 16} textAnchor="middle" fontSize="13" fontWeight="700" fill="#301607">{p}</text>
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-sm font-semibold text-[#592209]">{title}</figcaption>
    </figure>
  );
};

export const D1Chart = ({ k }: { k: KundaliResult }) => {
  const { t } = useTranslation();
  return k.lagna && k.planets ? (
    <BirthChartDiagram testId="chart-d1" title={t("birthChart.diagram.d1")} lagnaSign={k.lagna.rashi.sign} grahas={k.planets.map((p) => ({ planet: p.planet, sign: p.rashi.sign, house: p.house }))} />
  ) : null;
};

export const D9Chart = ({ k }: { k: KundaliResult }) => {
  const { t } = useTranslation();
  return k.navamsa ? (
    <BirthChartDiagram testId="chart-d9" title={t("birthChart.diagram.d9")} lagnaSign={k.navamsa.lagna.sign} grahas={k.navamsa.planets.map((p) => ({ planet: p.planet, sign: p.rashi.sign, house: p.house }))} />
  ) : null;
};

export default BirthChartDiagram;
