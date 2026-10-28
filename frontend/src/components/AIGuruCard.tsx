import { memo } from "react";
import { motion } from "framer-motion";
import { Mic, Send } from "lucide-react";
import { aiGuruFeature } from "@/data/features";
import FeatureButton from "./FeatureButton";

interface AIGuruCardProps {
  index: number;
}

const AIGuruCard = ({ index }: AIGuruCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
    className="hl-card group relative flex h-full flex-col overflow-hidden p-4"
  >
    <div className="mb-1 flex items-center">
      <h3 className="hl-serif text-xl font-semibold normal-case leading-tight tracking-[0.03em] text-home-ink">
        {aiGuruFeature.title}
      </h3>
    </div>
    <p className="mb-2 font-home-sans text-[0.9rem] leading-[1.45] text-home-muted">{aiGuruFeature.description}</p>

    <div className="hl-img-zoom mb-2 h-[110px] w-full overflow-hidden rounded-lg">
      <img
        src={aiGuruFeature.image}
        alt={aiGuruFeature.imageAlt}
        width={960}
        height={274}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>

    <div className="mb-3 flex h-9 items-center gap-2 rounded-full border border-home-line bg-home-parchment/60 px-4" aria-hidden="true">
      <span className="flex-1 truncate font-home-sans text-[0.9rem] text-home-muted">{aiGuruFeature.inputPlaceholder}</span>
      <Mic className="h-4 w-4 shrink-0 text-home-muted" />
      <Send className="h-4 w-4 shrink-0 text-home-gerua" />
    </div>

    <FeatureButton to={aiGuruFeature.buttonPath} label={aiGuruFeature.buttonLabel} className="mt-auto self-start" />
  </motion.div>
);

export default memo(AIGuruCard);
