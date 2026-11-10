import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import LotusOm from "./LotusOm";
import { GURU_TOPICS, type GuruTopic } from "./topics";

export const GURU_QUOTE = "Trust the universe. Your karma guides you, and your inner voice shows the way.";

interface Props {
  /** The signed-in user's display name. */
  name: string;
  topic: GuruTopic | null;
  onTopicChange: (t: GuruTopic | null) => void;
  /** Fills the composer with an example question (never sends it). */
  onStarter: (text: string) => void;
  /** The chat composer, placed inside the same frame as the topic cards. */
  children: ReactNode;
}

/** Calm welcome screen: greeting, quote, then one chat frame holding the topic cards and the composer. */
const WelcomePanel = ({ name, topic, onTopicChange, onStarter, children }: Props) => {
  const { t: tr } = useTranslation();
  return (
  <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center" data-testid="guru-welcome">
    <div className="flex flex-col items-center gap-3">
      <LotusOm size={88} />
      <h1 className="font-home-serif text-3xl font-semibold text-[#592209] sm:text-4xl">{tr("guru.welcome.greeting", { name })}</h1>
      <p className="max-w-xl font-home-serif text-lg italic leading-relaxed text-[#6B4A37]" data-testid="guru-quote">
        &ldquo;{tr("guru.welcome.quote")}&rdquo;
      </p>
    </div>

    <section
      aria-label={tr("guru.welcome.startAria")}
      className="w-full rounded-3xl border border-[#E58A45]/40 bg-[#FBF5EC] p-4 text-left shadow-[0_10px_36px_rgba(89,34,9,0.08)] sm:p-6"
      data-testid="guru-frame"
    >
      <p className="mb-3 text-center text-sm font-medium text-[#6B4A37]">{tr("guru.welcome.prompt")}</p>
      <div role="radiogroup" aria-label={tr("guru.welcome.topicGroup")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {GURU_TOPICS.map((t, i) => {
          const selected = topic?.id === t.id;
          const Icon = t.icon;
          return (
            <motion.button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onTopicChange(selected ? null : t)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05 } }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E58A45] ${
                selected ? "shadow-[0_6px_18px_rgba(89,34,9,0.16)]" : "hover:shadow-[0_6px_16px_rgba(89,34,9,0.10)]"
              }`}
              style={{ background: t.tint, borderColor: selected ? t.accent : "rgba(89,34,9,0.14)", borderWidth: selected ? 2 : 1 }}
            >
              <Icon className="h-6 w-6" style={{ color: t.accent }} aria-hidden="true" />
              <span className="text-sm font-semibold leading-tight text-[#301607]">{tr(`guru.topic.${t.tkey}.title`)}</span>
            </motion.button>
          );
        })}
      </div>

      {topic && (
        <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="topic-starters">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B4A37]">{tr(`guru.topic.${topic.tkey}.title`)}</span>
          {topic.starters.map((en, si) => {
            const s = tr(`guru.topic.${topic.tkey}.s${si + 1}`, { defaultValue: en });
            return (
            <button
              key={s}
              type="button"
              onClick={() => onStarter(s)}
              className="rounded-full border border-[#592209]/25 bg-white px-3 py-1.5 text-left text-sm text-[#301607] hover:border-[#E58A45] hover:bg-[#F5E9D6]"
            >
              {s}
            </button>
            );
          })}
        </div>
      )}

      <div className="mt-4">{children}</div>
    </section>
  </div>
  );
};

export default WelcomePanel;
