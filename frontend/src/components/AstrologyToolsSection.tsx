import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { tools } from "@/data/tools";
import ToolCard from "./ToolCard";

/**
 * Continues the Hero's visual language (same container width, Inter type,
 * orange accent) rather than resetting to the site's Iceland/uppercase
 * display styling used elsewhere on the page.
 */
const AstrologyToolsSection = () => (
  <section className="relative w-full pt-12 pb-24 md:pt-16 md:pb-28">
    <div className="container relative z-10 mx-auto px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-14 md:mb-16"
      >
        <h2 className="inline-flex flex-wrap items-center justify-center gap-3 font-['Inter'] font-bold text-3xl sm:text-4xl md:text-[2.75rem] text-white">
          <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-[#e8935f]" strokeWidth={1.75} />
          Explore Our{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #f2a35f, #d9895f)" }}
          >
            Astrology Tools
          </span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
        {tools.map((tool, index) => (
          <ToolCard key={tool.title} tool={tool} index={index} />
        ))}
      </div>
    </div>
  </section>
);

export default AstrologyToolsSection;
