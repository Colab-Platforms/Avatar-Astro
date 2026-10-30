import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { tools } from "@/data/tools";
import { useFeatureFlags } from "@/lib/featureFlags";
import ToolCard from "./ToolCard";

const AstrologyToolsSection = () => {
  // Tools the admin switched off are not listed (fails open if the config cannot load).
  const { isPathDisabled } = useFeatureFlags();
  const visibleTools = tools.filter((t) => !isPathDisabled(t.path));
  return (
  <section id="astrology-tools" tabIndex={-1} className="relative w-full scroll-mt-20 py-10 outline-none md:py-14" aria-labelledby="home-tools-h">
    <div className="container relative z-10 mx-auto px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-8 text-center md:mb-10"
      >
        <h2
          id="home-tools-h"
          className="hl-serif inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[1.625rem] font-semibold normal-case leading-[1.15] tracking-[0.03em] text-home-ink sm:text-[1.875rem] md:text-[2.1rem]"
        >
          <Sparkles className="h-5 w-5 text-home-gold md:h-6 md:w-6" strokeWidth={1.75} aria-hidden="true" />
          Explore Our <span className="text-home-gerua">Astrology Seva</span>
        </h2>
      </motion.div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {visibleTools.map((tool, index) => (
          <ToolCard key={tool.title} tool={tool} index={index} />
        ))}
      </div>
    </div>
  </section>
  );
};

export default AstrologyToolsSection;
