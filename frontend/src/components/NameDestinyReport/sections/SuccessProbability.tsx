import { useEffect, useRef, useState } from "react";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";

function useCountUpOnVisible(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          let start = 0;
          const step = target / (duration / 16);
          intervalId = setInterval(() => {
            start += step;
            if (start >= target) {
              setVal(target);
              if (intervalId) clearInterval(intervalId);
            } else setVal(Math.floor(start));
          }, 16);
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (intervalId) clearInterval(intervalId);
    };
  }, [target, duration]);
  return [val, ref] as const;
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const [count, ref] = useCountUpOnVisible(value);
  return (
    <div ref={ref} className="rounded-2xl bg-card border border-border p-4 text-center">
      <div className="text-2xl font-extrabold text-foreground">{count}%</div>
      <div className="text-xs font-semibold text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function seedScore(seed: string, base: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 23;
  return Math.max(20, Math.min(97, base + (h - 11)));
}

export default function SuccessProbability({
  name,
  profile,
}: {
  name: string;
  profile: NameProfileScore;
}) {
  const categories = ["Career", "Money", "Business", "Marriage", "Education", "Health", "Travel"];
  const scores = categories.map((c) => ({ label: c, value: seedScore(name + c, profile.overallScore) }));

  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        AI Success Probability
      </h3>
      <p className="text-center text-muted-foreground mb-6 text-sm">Directional alignment scores across life areas — not guarantees.</p>

      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scores.map((s) => (
            <ScoreCard key={s.label} label={s.label} value={s.value} />
          ))}
          <div className="col-span-2 sm:col-span-4 rounded-2xl bg-gradient-to-r from-gold to-gold-dim p-4 text-center">
            <div className="text-3xl font-extrabold text-cosmic-dark">{profile.overallScore}%</div>
            <div className="text-xs font-semibold text-cosmic-dark/80 mt-1">Overall Destiny Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}
