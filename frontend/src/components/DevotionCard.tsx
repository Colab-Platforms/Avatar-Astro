import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { devotionFeature } from "@/data/features";
import FeatureButton from "./FeatureButton";
import { useFeatureFlags } from "@/lib/featureFlags";

interface DevotionCardProps {
  index: number;
}

const DevotionCard = ({ index }: DevotionCardProps) => {
  const { isPathDisabled } = useFeatureFlags();
  return (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
    className="hl-card group relative flex h-full flex-col overflow-hidden p-4"
  >
    <div className="mb-1 flex items-center">
      <h3 className="hl-serif text-xl font-semibold normal-case leading-tight tracking-[0.03em] text-home-ink">
        {devotionFeature.title}
      </h3>
    </div>
    <p className="mb-2 font-home-sans text-[0.9rem] leading-[1.45] text-home-muted">{devotionFeature.description}</p>

    <div className="mb-3 grid auto-rows-fr grid-cols-2 gap-2 min-[460px]:grid-cols-3">
      {devotionFeature.items.filter((item) => !isPathDisabled(item.path)).map((item) => (
        <Link
          key={item.label}
          to={item.path}
          className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-lg border border-home-line bg-home-parchment/50 px-1.5 py-2 text-center transition-colors duration-300 hover:border-home-gerua/50 hover:bg-home-parchment motion-reduce:transition-none"
        >
          <item.icon className="h-[18px] w-[18px] text-home-gerua" strokeWidth={1.75} aria-hidden="true" />
          <span className="font-home-sans text-[0.8125rem] leading-tight text-home-ink">{item.label}</span>
        </Link>
      ))}
    </div>

    <FeatureButton to={devotionFeature.buttonPath} label={devotionFeature.buttonLabel} className="mt-auto self-start" />
  </motion.div>
  );
};

export default memo(DevotionCard);
