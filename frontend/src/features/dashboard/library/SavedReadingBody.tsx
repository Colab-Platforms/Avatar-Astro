import { lazy, Suspense } from "react";
import type { RatnaResult } from "@/features/ratna/types";
import { Loading } from "./ui";
import { ReadingView } from "./ReadingView";
import TarotSaved, { isTarotOutput } from "./renderers/TarotSaved";

// The Ratna renderer (and its stylesheet) is only downloaded when a Ratna reading is opened.
const RatnaSaved = lazy(() => import("./renderers/RatnaSaved"));

/** Same guard as the live Ratna page: a result from an older build is never half-rendered. */
export const isRatnaOutput = (v: unknown): v is RatnaResult => {
  const r = v as RatnaResult | null;
  return !!r && typeof r === "object" && (r.status === "complete" || r.status === "date_based") && !!r.birth && !!r.method && !!r.explanation && !!r.primary?.stone?.key && Array.isArray(r.primary.stone.themes);
};

type Renderer = { match: (output: unknown) => boolean; render: (output: any) => JSX.Element };

/**
 * Feature -> renderer. Each entry reuses (or mirrors) the layout of the live result for that feature. Anything without a dedicated
 * renderer falls through to the structured document view, which never shows raw JSON and never drops a field.
 */
export const RENDERERS: Record<string, Renderer> = {
  gemstone: { match: isRatnaOutput, render: (o) => <Suspense fallback={<Loading label="Opening your Ratna reading…" />}><RatnaSaved result={o} /></Suspense> },
  tarot: { match: isTarotOutput, render: (o) => <TarotSaved output={o} /> },
};

export const rendererKey = (feature: string, output: unknown): string => (RENDERERS[feature]?.match(output) ? feature : "structured");

export function SavedReadingBody({ feature, output }: { feature: string; output: unknown }) {
  const r = RENDERERS[feature];
  return r?.match(output) ? r.render(output) : <ReadingView output={output} />;
}
