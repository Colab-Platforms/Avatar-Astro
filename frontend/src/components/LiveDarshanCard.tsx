import { memo } from "react";
import { motion } from "framer-motion";
import { liveDarshanFeature } from "@/data/features";
import FeatureButton from "./FeatureButton";

interface LiveDarshanCardProps {
  index: number;
}

const LiveDarshanCard = ({ index }: LiveDarshanCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
    className="hl-card group relative flex h-full flex-col overflow-hidden p-4"
  >
    <div className="mb-1 flex items-center gap-2">
      <h3 className="hl-serif text-xl font-semibold normal-case leading-tight tracking-[0.03em] text-home-ink">
        {liveDarshanFeature.title}
      </h3>
      <span className="inline-flex items-center gap-1 rounded-full bg-home-ink px-2 py-0.5 font-home-sans text-[10px] font-bold tracking-wide text-home-cream">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-home-orange motion-reduce:animate-none" aria-hidden="true" />
        {liveDarshanFeature.liveLabel}
      </span>
    </div>
    <p className="mb-2 font-home-sans text-[0.9rem] leading-[1.45] text-home-muted">{liveDarshanFeature.description}</p>

    <div className="hl-img-zoom mb-2 h-[110px] w-full overflow-hidden rounded-lg">
      <img
        src={liveDarshanFeature.image}
        alt={liveDarshanFeature.title}
        className="h-full w-full object-cover object-[50%_42%]"
        loading="lazy"
      />
    </div>

    <div className="mb-3 grid grid-cols-3 gap-2">
      {liveDarshanFeature.thumbnails.map((thumb, i) => (
        <div key={i} className="h-9 overflow-hidden rounded-md border border-home-line">
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>

    <FeatureButton to={liveDarshanFeature.buttonPath} label={liveDarshanFeature.buttonLabel} className="mt-auto self-start" />
  </motion.div>
);

export default memo(LiveDarshanCard);
