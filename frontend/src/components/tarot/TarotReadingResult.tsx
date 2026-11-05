import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { FEATURES } from "@/data/featureCatalog";
import type { TarotCard } from "@/data/tarotData";
import TarotArt from "./TarotArt";

// Result screens for Tarot Bhagya and Karma Mirror. Both are built only from the cards that were drawn, the
// deck's own card data and the fields the reading service returned: nothing here writes new interpretation text.
// The follow-up ("Need More Guidance?") is rendered exactly once, at the bottom of each result.

export interface AIReading {
  currentLifeStage?: string;
  mainOpportunity?: string;
  hiddenChallenge?: string;
  nextMajorTurningPoint?: string;
  recommendedAction?: string;
  spiritualGuidance?: string;
  timelineNarrative?: { position: string; card: string; insight: string }[];
  overallMessage?: string;
  currentKarmaTheme?: string;
  rootCause?: string;
  lifeAreasAffected?: string[];
  dailyAction?: string;
  weeklyAction?: string;
  spiritualPractice?: string;
  recommendedHabit?: string;
  reflectionQuestion?: string;
  positiveAffirmation?: string;
  cardInsights?: { position: string; card: string; insight: string }[];
}

export const TIMELINE_POSITIONS = ["Past Energy", "Current Energy", "Hidden Influence", "Next 6 Months", "Future Potential"];
export const KARMA_POSITIONS = ["Current Karma", "Hidden Blockage", "Healing Path"];
/** Names the timeline spread uses for each position in the result. */
export const TIMELINE_RESULT_LABELS = ["Past Soul Lesson", "Current Path", "Hidden Calling", "Next Awakening", "Purpose Guidance"];

const TIMELINE_POSITION_QUESTIONS = [
  "What experiences or patterns from your past are influencing you?",
  "What is happening in your life right now?",
  "What might be affecting your situation without you noticing?",
  "What themes or challenges should you prepare for?",
  "What opportunities or possibilities can you reflect on?",
];
const KARMA_POSITION_QUESTIONS = [
  "What recurring behaviour or life pattern are you experiencing?",
  "What fears, habits or beliefs might be stopping your progress?",
  "What changes or positive actions can help you move forward?",
];

const FONT = "'DM Sans', system-ui, sans-serif";

/** Splits text into sentences without changing any of its words. */
export const splitSentences = (text?: string): string[] =>
  (text ?? "").trim().split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter(Boolean);

/** Overall message → main message / what it means / key takeaway, using only the generated sentences. */
export const splitOverall = (text?: string): { main: string; means: string; takeaway: string } => {
  const s = splitSentences(text);
  if (s.length === 0) return { main: "", means: "", takeaway: "" };
  if (s.length === 1) return { main: s[0], means: "", takeaway: "" };
  if (s.length === 2) return { main: s[0], means: "", takeaway: s[1] };
  return { main: s[0], means: s.slice(1, -1).join(" "), takeaway: s[s.length - 1] };
};

export const tarotContext = (cards: TarotCard[], positions: string[], reading: AIReading, question?: string): string =>
  [
    question ? `Question: ${question}` : "",
    `Cards: ${cards.map((c, i) => `${positions[i] ?? i + 1}: ${c.name}`).join("; ")}.`,
    reading.overallMessage ? `Overall message: ${reading.overallMessage}` : "",
    reading.currentKarmaTheme ? `Karma theme: ${reading.currentKarmaTheme}` : "",
    reading.recommendedAction ? `Suggested action: ${reading.recommendedAction}` : "",
  ].filter(Boolean).join("\n");

// ─── Visual card ─────────────────────────────────────────────────────────────

const numeral = (c: TarotCard) => (c.arcana === "major" ? c.number : c.suit ?? "");

export const TarotCardVisual: React.FC<{
  card: TarotCard; label: string; sublabel?: string; index: number; selected?: boolean; onSelect?: () => void;
}> = ({ card, label, sublabel, index, selected = false, onSelect }) => (
  <motion.div
    className="trr-card-col"
    initial={{ opacity: 0, y: 28, rotateY: 90 }}
    animate={{ opacity: 1, y: 0, rotateY: 0 }}
    transition={{ delay: 0.15 + index * 0.12, duration: 0.6, ease: "easeOut" }}
  >
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${numeral(card)} ${card.name}, ${label}. Show meaning`}
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`trr-card${selected ? " is-selected" : ""}`}
    >
      <TarotArt card={card} />
      <span className="trr-card-num">{numeral(card)}</span>
      <span className="trr-card-name">{card.name}</span>
    </motion.button>
    <span className="trr-card-pos">{label}</span>
    {sublabel && <span className="trr-card-sub">{sublabel}</span>}
  </motion.div>
);

// ─── Building blocks ─────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="trr-section-title">
    <h2>{title}</h2>
    {hint && <p>{hint}</p>}
  </div>
);

const GuidanceCard: React.FC<{ icon: string; title: string; question: string; value?: string; tone?: "plain" | "soft" }> = ({ icon, title, question, value, tone = "plain" }) => {
  if (!value) return null;
  return (
    <motion.section
      className={`trr-guide trr-guide--${tone}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
    >
      <header>
        <span className="trr-guide-icon" aria-hidden>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p className="trr-guide-q">{question}</p>
        </div>
      </header>
      <p className="trr-guide-body">{value}</p>
    </motion.section>
  );
};

interface StoryProps {
  card: TarotCard; index: number; label: string; sublabel?: string; positionQuestion: string;
  insight?: string; insightTitle: string; extras?: { title: string; text?: string }[];
  compact?: boolean; highlighted?: boolean; id?: string;
}

/** Same layout for every card: artwork, position, simple meaning, what it means for the situation, what to learn. */
const CardStory: React.FC<StoryProps> = ({ card, index, label, sublabel, positionQuestion, insight, insightTitle, extras = [], compact = false, highlighted = false, id }) => (
  <motion.article
    id={id}
    className={`trr-story${highlighted ? " is-highlighted" : ""}${compact ? " is-compact" : ""}`}
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45, delay: compact ? 0 : Math.min(index, 2) * 0.06 }}
  >
    <div className="trr-story-art">
      <div className="trr-mini"><TarotArt card={card} /><span className="trr-card-num">{numeral(card)}</span></div>
    </div>
    <div className="trr-story-body">
      <p className="trr-eyebrow">Card {index + 1} · {label}{sublabel ? ` · ${sublabel}` : ""}</p>
      <h3 className="trr-story-title">{card.name}</h3>
      <p className="trr-story-q">{positionQuestion}</p>

      <div className="trr-block">
        <h4>Simple Card Meaning</h4>
        <p>{card.meaning}</p>
      </div>
      {insight && (
        <div className="trr-block trr-block--accent">
          <h4>{insightTitle}</h4>
          <p>{insight}</p>
        </div>
      )}
      {!compact && (
        <div className="trr-block">
          <h4>What You Can Learn From This Card</h4>
          <ul className="trr-chips">{card.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
          {card.shadow && <p className="trr-watch"><strong>Worth watching for: </strong>{card.shadow}</p>}
        </div>
      )}
      {!compact && extras.filter((e) => e.text).map((e) => (
        <div className="trr-block trr-block--action" key={e.title}>
          <h4>{e.title}</h4>
          <p>{e.text}</p>
        </div>
      ))}
    </div>
  </motion.article>
);

// ─── Shared header + card row ────────────────────────────────────────────────

const ResultHeader: React.FC<{ product: string; title: React.ReactNode; area?: string; instruction: string }> = ({ product, title, area, instruction }) => (
  <motion.header className="trr-header" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <p className="trr-kicker">{FEATURES.tarot.name}</p>
    <p className="trr-product">{product}</p>
    <h1>{title}</h1>
    {area && <p className="trr-area"><span>Life area</span> {area}</p>}
    <p className="trr-instruction">{instruction}</p>
  </motion.header>
);

const Hint: React.FC<{ selected: boolean }> = ({ selected }) => (
  <p className="trr-hint" aria-live="polite">{selected ? "Select the same card again to close it." : "Tap a card to read its meaning."}</p>
);

// ─── Tarot Bhagya ─────────────────────────────────────────────────────

export const TimelineResult: React.FC<{ cards: TarotCard[]; reading: AIReading; question?: string; embedded?: boolean; children?: React.ReactNode }> = ({ cards, reading, question, embedded = false, children }) => {
  const [active, setActive] = useState<number | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const overall = useMemo(() => splitOverall(reading.overallMessage), [reading.overallMessage]);
  const area = question || undefined;
  const narrative = reading.timelineNarrative ?? [];
  const situation = area ? `What This Means for Your ${area}` : "What This Means for Your Situation";
  const activeCard = active !== null ? cards[active] : null;

  return (
    <div className="trr-root" data-testid="tarot-timeline-result">
      <TarotResultStyles />
      {!embedded && <ResultHeader
        product="Tarot Bhagya™"
        title={<>Your Soul&apos;s <em>Timeline</em></>}
        area={area}
        instruction="Explore the five cards to understand each stage of your reading. Select a card to discover its meaning and guidance."
      />}

      <div className="trr-cards trr-cards--5" role="group" aria-label="Your five cards">
        {cards.map((card, i) => (
          <TarotCardVisual key={card.id} card={card} index={i} label={TIMELINE_RESULT_LABELS[i]} sublabel={TIMELINE_POSITIONS[i]}
            selected={active === i} onSelect={() => setActive((cur) => (cur === i ? null : i))} />
        ))}
      </div>
      <Hint selected={active !== null} />

      <AnimatePresence mode="wait">
        {activeCard && active !== null && (
          <motion.div key={active} className="trr-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }} data-testid="tarot-card-panel">
            <CardStory compact card={activeCard} index={active} label={TIMELINE_RESULT_LABELS[active]} sublabel={TIMELINE_POSITIONS[active]}
              positionQuestion={TIMELINE_POSITION_QUESTIONS[active]} insight={narrative[active]?.insight} insightTitle={situation} />
          </motion.div>
        )}
      </AnimatePresence>

      {overall.main && (
        <section className="trr-overall" aria-labelledby="trr-overall-h">
          <SectionTitle title="Overall Reading" hint="The whole spread in three short parts." />
          <div className="trr-overall-grid">
            <motion.div className="trr-overall-main" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
              <h3 id="trr-overall-h">Main Message</h3>
              <p className="trr-lead">{overall.main}</p>
            </motion.div>
            {overall.means && (
              <motion.div className="trr-overall-means" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.08 }}>
                <h3>What This Means for You</h3>
                <p>{overall.means}</p>
              </motion.div>
            )}
            {overall.takeaway && (
              <motion.div className="trr-takeaway" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.16 }}>
                <h3>Key Takeaway</h3>
                <p>{overall.takeaway}</p>
              </motion.div>
            )}
          </div>
        </section>
      )}

      <section className="trr-sections">
        <SectionTitle title="Your Reading, Step by Step" hint="Each part answers one simple question." />
        <div className="trr-guide-grid">
          <GuidanceCard icon="🌱" title="Where You Are Now" question="What does your present situation look like?" value={reading.currentLifeStage} />
          <GuidanceCard icon="✨" title="What's Helping You" question="Which strengths or supports are on your side?" value={reading.mainOpportunity} />
          <GuidanceCard icon="🌫" title="What's Blocking You" question="Which habits, fears or circumstances may be getting in the way?" value={reading.hiddenChallenge} />
          <GuidanceCard icon="🧭" title="A Theme To Prepare For" question="What is worth keeping in mind over the next six months? It is a possibility, not a prediction." value={reading.nextMajorTurningPoint} />
          <GuidanceCard icon="👣" title="A Step You Could Take" question="What is one practical thing you can try?" value={reading.recommendedAction} tone="soft" />
          <GuidanceCard icon="🪔" title="Reflective Guidance" question="What simple thought can you carry with you?" value={reading.spiritualGuidance} tone="soft" />
        </div>
      </section>

      {narrative.length > 0 && (
        <section className="trr-stories" ref={storyRef}>
          <SectionTitle title="Your Card-by-Card Story" hint="How each card connects to your question." />
          <div className="trr-story-list">
            {narrative.map((n, i) => cards[i] && (
              <CardStory key={i} id={`trr-story-${i}`} card={cards[i]} index={i} label={TIMELINE_RESULT_LABELS[i]} sublabel={TIMELINE_POSITIONS[i]}
                positionQuestion={TIMELINE_POSITION_QUESTIONS[i]} insight={n.insight} insightTitle={situation} highlighted={active === i} />
            ))}
          </div>
        </section>
      )}

      {!embedded && <div className="trr-follow"><AskDivyaSection feature="tarot" context={tarotContext(cards, TIMELINE_POSITIONS, reading, question)} /></div>}
      {children}
    </div>
  );
};

// ─── Karma Mirror ────────────────────────────────────────────────────────────

export const KarmaResult: React.FC<{ cards: TarotCard[]; reading: AIReading; embedded?: boolean; children?: React.ReactNode }> = ({ cards, reading, embedded = false, children }) => {
  const [active, setActive] = useState<number | null>(null);
  const insights = reading.cardInsights ?? [];
  const areas = reading.lifeAreasAffected ?? [];
  const select = (i: number) => {
    setActive((cur) => (cur === i ? null : i));
    document.getElementById(`trr-karma-${i}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };
  // What each stage adds on top of the card's own insight (all from the generated reading).
  const extras: { title: string; text?: string }[][] = [
    [],
    [{ title: "Where This Pattern May Come From", text: reading.rootCause }],
    [{ title: "A Habit To Build", text: reading.recommendedHabit }, { title: "Say This To Yourself", text: reading.positiveAffirmation }],
  ];
  const hasActions = !!(reading.dailyAction || reading.weeklyAction || reading.spiritualPractice || reading.reflectionQuestion);

  return (
    <div className="trr-root" data-testid="tarot-karma-result">
      <TarotResultStyles />
      {!embedded && <ResultHeader
        product="Karma Mirror™"
        title={<>The Mirror <em>Reveals</em></>}
        instruction="Explore the three cards to understand the pattern, what may be holding you back, and your path forward. Select a card to read its meaning. This is a reflection, not a prediction."
      />}

      <div className="trr-cards trr-cards--3" role="group" aria-label="Your three cards">
        {cards.map((card, i) => (
          <TarotCardVisual key={card.id} card={card} index={i} label={KARMA_POSITIONS[i]} selected={active === i} onSelect={() => select(i)} />
        ))}
      </div>
      <Hint selected={active !== null} />

      {reading.currentKarmaTheme && (
        <section className="trr-overall">
          <SectionTitle title="Overall Karma Reflection" hint="The central pattern your three cards point to." />
          <div className="trr-overall-grid trr-overall-grid--one">
            <motion.div className="trr-overall-main" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
              <h3>What Your Pattern Is Showing You</h3>
              <p className="trr-lead">{reading.currentKarmaTheme}</p>
              {areas.length > 0 && (
                <div className="trr-areas"><span>Areas of life this may touch</span>
                  <ul className="trr-chips">{areas.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {insights.length > 0 && (
        <section className="trr-stories">
          <SectionTitle title="Your Three Steps" hint="Current Karma → Hidden Blockage → Healing Path" />
          <div className="trr-story-list">
            {insights.map((n, i) => cards[i] && (
              <CardStory key={i} id={`trr-karma-${i}`} card={cards[i]} index={i} label={KARMA_POSITIONS[i]} positionQuestion={KARMA_POSITION_QUESTIONS[i]}
                insight={n.insight} insightTitle="What This Means for Your Situation" extras={extras[i]} highlighted={active === i} />
            ))}
          </div>
        </section>
      )}

      {hasActions && (
        <section className="trr-sections">
          <SectionTitle title="Practical Reflection and Actions" hint="Small things you can try, at your own pace." />
          <div className="trr-guide-grid">
            <GuidanceCard icon="☀" title="Every Day" question="What small practice can you repeat daily?" value={reading.dailyAction} tone="soft" />
            <GuidanceCard icon="🌙" title="Once a Week" question="What deeper step can you take each week?" value={reading.weeklyAction} tone="soft" />
            <GuidanceCard icon="🧘" title="A Quiet Practice" question="How can you reflect on your Healing Path?" value={reading.spiritualPractice} />
            <GuidanceCard icon="🔍" title="Think About This" question="One question to sit with." value={reading.reflectionQuestion} />
          </div>
        </section>
      )}

      {reading.positiveAffirmation && (
        <section className="trr-overall trr-overall--narrow">
          <motion.div className="trr-takeaway" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
            <h3>Key Takeaway</h3>
            <p>&ldquo;{reading.positiveAffirmation}&rdquo;</p>
          </motion.div>
        </section>
      )}

      {!embedded && <div className="trr-follow"><AskDivyaSection feature="tarot" context={tarotContext(cards, KARMA_POSITIONS, reading)} /></div>}
      {children}
    </div>
  );
};

// ─── Styles (scoped under .trr-root) ─────────────────────────────────────────

const TarotResultStyles = () => (
  <style>{`
.trr-root{position:relative;z-index:1;width:100%;max-width:1100px;margin:0 auto;padding:clamp(28px,5vw,56px) clamp(16px,4vw,32px) 24px;box-sizing:border-box;font-family:${FONT};color:#301607;overflow-x:clip}
.trr-root *{box-sizing:border-box}
.trr-header{text-align:center;margin-bottom:clamp(24px,4vw,40px)}
.trr-kicker{margin:0 0 4px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#6B4A37}
.trr-product{margin:0 0 10px;font-size:15px;font-weight:600;color:#592209}
.trr-header h1{margin:0 0 10px;font-size:clamp(30px,5.2vw,46px);line-height:1.15;font-weight:700;letter-spacing:.02em;color:#301607}
.trr-header h1 em{font-style:normal;color:#592209}
.trr-area{display:inline-flex;gap:8px;align-items:center;margin:0 0 14px;padding:5px 14px;border-radius:999px;background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.25);font-size:15px;font-weight:600;color:#592209}
.trr-area span{font-weight:500;color:#6B4A37}
.trr-instruction{margin:0 auto;max-width:620px;font-size:16px;line-height:1.7;color:#4A3022}
.trr-cards{display:flex;gap:clamp(12px,2vw,24px);justify-content:center;align-items:flex-start;padding:10px 4px 6px}
.trr-cards--5{--w:clamp(118px,15vw,176px)}
.trr-cards--3{--w:clamp(96px,26vw,200px);gap:clamp(10px,3vw,32px)}
.trr-card-col{display:flex;flex-direction:column;align-items:center;gap:8px;width:var(--w);flex:0 0 var(--w);perspective:900px;scroll-snap-align:center}
.trr-card{position:relative;display:block;width:100%;aspect-ratio:2/3;padding:0;border-radius:12px;overflow:hidden;cursor:pointer;background:#2A0F04;border:2px solid #C9873A;box-shadow:0 6px 18px rgba(48,22,7,.28);transition:box-shadow .25s,border-color .25s}
.trr-card:hover{box-shadow:0 12px 28px rgba(89,34,9,.4)}
.trr-card:focus-visible{outline:3px solid #592209;outline-offset:3px}
.trr-card.is-selected{border-color:#E9B872;box-shadow:0 0 0 3px rgba(89,34,9,.9),0 14px 32px rgba(89,34,9,.45)}
.trr-card-num{position:absolute;top:0;left:0;right:0;padding:7px 4px 14px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.14em;color:#F5E9D6;background:linear-gradient(to bottom,rgba(18,6,2,.88),transparent)}
.trr-card-name{position:absolute;left:0;right:0;bottom:0;padding:22px 6px 9px;text-align:center;font-size:clamp(12px,1.5vw,15px);font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;color:#F5E9D6;background:linear-gradient(to top,rgba(18,6,2,.95) 40%,transparent)}
.trr-card-pos{font-size:14px;font-weight:700;color:#592209;text-align:center;line-height:1.25}
.trr-card-sub{font-size:12px;color:#6B4A37;text-align:center;line-height:1.25;margin-top:-4px}
.trr-hint{margin:10px 0 0;text-align:center;font-size:14px;color:#6B4A37}
.trr-panel{max-width:760px;margin:18px auto 0}
.trr-overall{margin-top:clamp(36px,6vw,64px)}
.trr-overall--narrow{max-width:720px;margin-left:auto;margin-right:auto}
.trr-section-title{text-align:center;margin-bottom:22px}
.trr-section-title h2{margin:0;font-size:clamp(22px,3.4vw,30px);font-weight:700;color:#301607}
.trr-section-title p{margin:6px 0 0;font-size:15px;color:#6B4A37}
.trr-overall-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.trr-overall-grid--one{grid-template-columns:1fr;max-width:760px;margin:0 auto}
.trr-overall-main{grid-column:1/-1;padding:clamp(20px,3vw,30px);border-radius:18px;background:linear-gradient(150deg,#592209,#3b1706);color:#F5E9D6;box-shadow:0 10px 28px rgba(89,34,9,.3)}
.trr-overall-main h3{margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#E9B872}
.trr-lead{margin:0;font-size:clamp(18px,2.4vw,22px);line-height:1.6;font-weight:500;overflow-wrap:anywhere}
.trr-overall-means,.trr-takeaway{padding:22px;border-radius:16px;border:1px solid rgba(89,34,9,.25);background:#F5E9D6}
.trr-takeaway{background:#FFF7E6;border-color:#C9873A;box-shadow:inset 4px 0 0 #C9873A}
.trr-overall-means h3,.trr-takeaway h3{margin:0 0 8px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#592209}
.trr-overall-means p,.trr-takeaway p{margin:0;font-size:17px;line-height:1.75;color:#301607;overflow-wrap:anywhere}
.trr-takeaway p{font-weight:600}
.trr-areas{margin-top:16px;padding-top:14px;border-top:1px solid rgba(245,233,214,.25);font-size:13px;color:#E9B872}
.trr-areas .trr-chips{margin-top:8px}
.trr-areas .trr-chips li{background:rgba(245,233,214,.14);border-color:rgba(245,233,214,.35);color:#F5E9D6}
.trr-sections,.trr-stories{margin-top:clamp(36px,6vw,64px)}
.trr-guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.trr-guide{padding:22px;border-radius:16px;border:1px solid rgba(89,34,9,.25);background:#FBF5EC;box-shadow:0 2px 10px rgba(48,22,7,.06)}
.trr-guide--soft{background:#F5E9D6}
.trr-guide header{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
.trr-guide-icon{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:50%;background:rgba(89,34,9,.1);font-size:18px}
.trr-guide h3{margin:0;font-size:18px;font-weight:700;color:#592209;line-height:1.25}
.trr-guide-q{margin:3px 0 0;font-size:13.5px;line-height:1.45;color:#6B4A37;font-style:italic}
.trr-guide-body{margin:0;font-size:16.5px;line-height:1.75;color:#301607;overflow-wrap:anywhere}
.trr-story-list{display:flex;flex-direction:column;gap:18px}
.trr-story{display:grid;grid-template-columns:150px 1fr;gap:clamp(16px,3vw,28px);padding:clamp(16px,3vw,26px);border-radius:18px;border:1px solid rgba(89,34,9,.25);background:#FBF5EC;box-shadow:0 2px 10px rgba(48,22,7,.06);scroll-margin-top:90px;transition:box-shadow .3s,border-color .3s}
.trr-story.is-highlighted{border-color:#592209;box-shadow:0 0 0 2px rgba(89,34,9,.55),0 10px 26px rgba(89,34,9,.2)}
.trr-story.is-compact{grid-template-columns:96px 1fr;background:#F5E9D6}
.trr-mini{position:relative;width:100%;aspect-ratio:2/3;border-radius:10px;overflow:hidden;border:2px solid #C9873A;background:#2A0F04}
.trr-mini .trr-card-num{font-size:11px;padding:5px 2px 10px}
.trr-eyebrow{margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#6B4A37}
.trr-story-title{margin:0;font-size:clamp(22px,3vw,28px);font-weight:700;color:#592209;line-height:1.2}
.trr-story-q{margin:4px 0 14px;font-size:14.5px;font-style:italic;color:#6B4A37;line-height:1.5}
.trr-block{margin-top:12px}
.trr-block h4{margin:0 0 4px;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:#592209}
.trr-block p{margin:0;font-size:16.5px;line-height:1.75;color:#301607;overflow-wrap:anywhere}
.trr-block--accent{padding:12px 14px;border-radius:12px;background:rgba(89,34,9,.07);border-left:4px solid #592209}
.trr-block--action{padding:12px 14px;border-radius:12px;background:#FFF7E6;border-left:4px solid #C9873A}
.trr-watch{margin-top:8px!important;font-size:15px!important;color:#4A3022!important}
.trr-chips{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 0;padding:0;list-style:none}
.trr-chips li{padding:4px 12px;border-radius:999px;border:1px solid rgba(89,34,9,.3);background:rgba(89,34,9,.07);font-size:14px;font-weight:500;color:#592209}
.trr-follow{margin-top:clamp(36px,6vw,64px)}
@media (max-width:1100px){
  .trr-root{padding-top:72px}
}
@media (max-width:900px){
  .trr-guide-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:767px){
  .trr-cards--5{--w:138px;justify-content:flex-start;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:10px 16px 14px;margin:0 -16px}
  .trr-overall-grid{grid-template-columns:1fr}
  .trr-guide-grid{grid-template-columns:1fr}
  .trr-story{grid-template-columns:1fr}
  .trr-story-art{width:120px}
  .trr-story.is-compact{grid-template-columns:84px 1fr}
  .trr-story.is-compact .trr-story-art{width:auto}
}
@media (prefers-reduced-motion:reduce){.trr-card,.trr-story{transition:none}}
`}</style>
);
