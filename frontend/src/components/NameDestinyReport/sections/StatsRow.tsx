import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

function useCountUpOnVisible(target: number, duration = 1400) {
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
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (intervalId) clearInterval(intervalId);
    };
  }, [target, duration]);
  return [val, ref] as const;
}

type Stat =
  | { kind: "counter"; value: number; suffix: string; label: string }
  | { kind: "static"; label: string };

const STATS: Stat[] = [
  { kind: "counter", value: 50000, suffix: "+", label: "Name Analyses" },
  { kind: "counter", value: 95, suffix: "%", label: "User Satisfaction" },
  { kind: "static", label: "AI + Vedic Analysis" },
  { kind: "static", label: "Multiple Numerology Systems" },
];

function CounterStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, ref] = useCountUpOnVisible(value);
  const display = value >= 1000 ? count.toLocaleString() : count;
  return (
    <div ref={ref} className="glass-card rounded-2xl py-7 px-4 text-center">
      <div className="text-2xl md:text-3xl font-extrabold text-foreground">
        {display}
        {suffix}
      </div>
      <div className="text-xs md:text-sm text-foreground/70 mt-1.5 tracking-wide">{label}</div>
    </div>
  );
}

function StaticStat({ label }: { label: string }) {
  return (
    <div className="glass-card rounded-2xl py-7 px-4 text-center flex flex-col items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-[#592209] mb-3" style={{ boxShadow: "0 0 10px rgba(89,34,9,0.7)" }} />
      <div className="text-xs md:text-sm text-foreground/70 font-semibold tracking-wide">{label}</div>
    </div>
  );
}

export default function StatsRow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-4"
    >
      {STATS.map((s, i) =>
        s.kind === "counter" ? (
          <CounterStat key={i} value={s.value} suffix={s.suffix} label={s.label} />
        ) : (
          <StaticStat key={i} label={s.label} />
        )
      )}
    </motion.div>
  );
}
