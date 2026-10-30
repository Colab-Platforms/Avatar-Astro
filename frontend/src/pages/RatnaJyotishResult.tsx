import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import RatnaEmblem from "@/features/ratna/RatnaEmblem";
import { ResultView } from "@/features/ratna/ResultView";
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
    document.title = "Your Ratna Jyotish Reading | My Bhagya";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const again = () => {
    clearResult();
    navigate("/ratna-jyotish", { replace: true }); // swap the result entry for the form: no result/form loop in history
  };

  if (!result) {
    return (
      <section className="mx-auto max-w-xl px-4 pb-20 pt-10 text-center" data-testid="ratna-empty">
        <RatnaEmblem size={72} className="mx-auto" />
        <h1 className="mt-4 font-home-serif text-3xl font-semibold text-[#592209]">No Ratna Jyotish result yet</h1>
        <p className="mt-3 text-lg text-[#4A2E1F]">
          Enter your birth details to see the Ratna traditionally associated with your birth chart.
        </p>
        <Link to="/ratna-jyotish" className="ratna-btn mt-6 inline-flex items-center justify-center">
          Calculate My Ratna
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-[min(94vw,1800px)] pb-16 pt-4 sm:pt-6">
      <ResultView result={result} />

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/ratna-jyotish" replace className="ratna-btn-ghost inline-flex items-center justify-center">
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
