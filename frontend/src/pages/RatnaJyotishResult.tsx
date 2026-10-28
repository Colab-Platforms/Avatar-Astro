import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import RatnaEmblem from "@/features/ratna/RatnaEmblem";
import { ResultView } from "@/features/ratna/ResultView";
import ShopSections from "@/features/ratna/ShopSections";
import { clearResult, loadResult, looksLikeResult } from "@/features/ratna/storage";
import type { RatnaResult } from "@/features/ratna/types";
import "@/features/ratna/ratna.css";

const RatnaJyotishResult = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Router state first (fresh navigation), then session storage (refresh).
  const result = useMemo<RatnaResult | null>(() => {
    const fromState = (location.state as { result?: unknown } | null)?.result;
    return looksLikeResult(fromState) ? fromState : loadResult();
  }, [location.state]);

  useEffect(() => {
    document.title = "Ratna Jyotish Result | My Bhagya";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const again = () => {
    clearResult();
    navigate("/ratna-jyotish");
  };

  if (!result) {
    return (
      <section className="mx-auto max-w-xl px-4 pb-20 pt-10 text-center" data-testid="ratna-empty">
        <RatnaEmblem size={72} className="mx-auto" />
        <h1 className="mt-4 font-astra text-3xl text-[#f0d58a]">No Ratna Jyotish result yet</h1>
        <p className="mt-3 text-lg text-slate-300">
          Enter your birth details to see the gemstone traditionally associated with your birth chart.
        </p>
        <Link to="/ratna-jyotish" className="ratna-btn mt-6 inline-flex items-center justify-center">
          Calculate My Gemstone
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-12 sm:px-6">
      <header className="text-center">
        <RatnaEmblem size={72} className="mx-auto" />
        <h1 className="mt-3 font-astra text-4xl text-[#f0d58a] sm:text-5xl">Ratna Jyotish</h1>
        <p className="mt-2 text-base text-slate-400">
          {result.birth.dateOfBirth}
          {result.birth.timeOfBirth ? ` · ${result.birth.timeOfBirth}` : " · birth time unknown"} · {result.birth.place}
        </p>
      </header>

      <div className="mt-6 space-y-6">
        <ResultView result={result} />
        {result.recommendation && (
          <ShopSections stoneKey={result.recommendation.stone.key} stoneName={result.recommendation.stone.name} />
        )}
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/ratna-jyotish" className="ratna-btn-ghost inline-flex items-center justify-center">
          Back to Birth Details
        </Link>
        <button type="button" className="ratna-btn" onClick={again}>
          Calculate Again
        </button>
      </div>
    </section>
  );
};

export default RatnaJyotishResult;
