import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EVENT_CARDS, GROUPS, type EventCard, type EventGroup } from "./events";

/** Event selection: four groups as tabs, each showing its events as cards, so fifteen choices are never on screen at once. */
export default function EventPicker({ onPick, initialGroup = "personal" }: { onPick: (e: EventCard) => void; initialGroup?: EventGroup }) {
  const [group, setGroup] = useState<EventGroup>(initialGroup);
  const reduce = useReducedMotion();
  const cards = EVENT_CARDS.filter((e) => e.group === group);

  return (
    <section aria-labelledby="muhurat-pick-h" className="mx-auto max-w-6xl">
      <h2 id="muhurat-pick-h" className="mb-5 text-center text-2xl font-bold uppercase tracking-wide text-[#301607]">What are you planning?</h2>
      <div role="tablist" aria-label="Kinds of events" className="mb-6 flex flex-wrap justify-center gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            id={`muhurat-tab-${g.id}`}
            aria-selected={group === g.id}
            aria-controls="muhurat-panel"
            type="button"
            onClick={() => setGroup(g.id)}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${group === g.id ? "border-[#592209] bg-[#592209] text-[#F7DC8A]" : "border-[#592209]/30 text-[#592209] hover:bg-[#592209]/10"}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div id="muhurat-panel" role="tabpanel" aria-labelledby={`muhurat-tab-${group}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((e, i) => (
          <motion.button
            key={e.id}
            type="button"
            data-testid="event-card"
            onClick={() => onPick(e)}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reduce ? 0 : i * 0.05 }}
            whileHover={reduce ? undefined : { y: -3 }}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-[#C9873A]/40 bg-[#FFFDF6] p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#592209]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#592209] text-[#F7DC8A]"><e.Icon size={22} aria-hidden="true" /></span>
            <span className="text-lg font-bold leading-snug text-[#301607]">{e.label}</span>
            <span className="text-sm text-[#6B4A37]">{e.summary}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
