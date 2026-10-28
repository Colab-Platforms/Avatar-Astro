import RatnaEmblem from "./RatnaEmblem";
import { formatBirthDate } from "./format";
import type { RatnaResult } from "./types";

const STARS: [number, number][] = [
  [6, 30], [14, 70], [24, 18], [76, 22], [88, 64], [94, 28], [60, 8], [40, 82],
];

const Chip = ({ children }: { children: React.ReactNode }) => (
  <li className="max-w-full break-words rounded-full border border-[#d4a64a]/35 bg-[#081426]/60 px-3 py-1 text-sm text-slate-200">
    {children}
  </li>
);

const ResultHero = ({ result }: { result: RatnaResult }) => (
  <header className="ratna-hero relative isolate overflow-hidden px-2 pb-1 pt-14 text-center sm:pt-3">
    <div className="ratna-hero-glow" aria-hidden="true" />
    {STARS.map(([x, y], i) => (
      <span
        key={i}
        aria-hidden="true"
        className={`ratna-star absolute h-[3px] w-[3px] rounded-full bg-[#f5e4b0] ${i > 4 ? "hidden sm:block" : ""}`}
        style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s` }}
      />
    ))}
    <div className="ratna-reveal" style={{ ["--i" as string]: 0 }}>
      <RatnaEmblem size={48} className="mx-auto h-[40px] w-[40px] sm:h-[48px] sm:w-[48px]" />
      <p className="mt-1 text-xs font-semibold tracking-[0.28em] text-[#d4a64a]">YOUR PERSONAL GEMSTONE</p>
      <h1 className="mt-1 font-astra text-[1.4rem] leading-tight text-[#f0d58a] min-[420px]:text-2xl sm:text-3xl lg:text-4xl">Your Ratna Jyotish Reading</h1>
    </div>
    <ul
      className="ratna-reveal mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-1.5"
      style={{ ["--i" as string]: 1 }}
      aria-label="Birth details used"
    >
      <Chip>Born {formatBirthDate(result.birth.dateOfBirth)}</Chip>
      <Chip>{result.birth.timeOfBirth ? `at ${result.birth.timeOfBirth}` : "Birth time not provided"}</Chip>
      <Chip>{result.birth.place}</Chip>
    </ul>
  </header>
);

export default ResultHero;
