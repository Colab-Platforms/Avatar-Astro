import { memo } from "react";
import Tx from "@/i18n/Tx";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { AstrologyTool } from "@/data/tools";

/** A stable translation key for a card: its route without the slashes ("/baby-name-jyotish" becomes "baby-name-jyotish"). */
export const cardKey = (path: string, part: "title" | "description" | "button"): string => `seva.${path.replace(/^\//, "").replace(/\//g, "-")}.${part}`;

interface ToolCardProps {
  tool: AstrologyTool;
  index: number;
}

const ToolCard = ({ tool, index }: ToolCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: (index % 3) * 0.07, ease: "easeOut" }}
    className="hl-card group relative flex h-full flex-col overflow-hidden p-3"
  >
    <div className="hl-img-zoom relative h-48 shrink-0 overflow-hidden rounded-xl sm:h-52">
      <img
        src={tool.image}
        alt={tool.title}
        width={960}
        height={492}
        className="h-full w-full object-cover object-center"
        style={tool.imagePosition ? { objectPosition: tool.imagePosition } : undefined}
        loading="lazy"
        decoding="async"
      />
      {tool.logo && (
        <img
          src={tool.logo}
          alt=""
          aria-hidden="true"
          data-testid="tool-logo"
          width={64}
          height={64}
          className="absolute left-2.5 top-2.5 h-14 w-14 rounded-full bg-[#FBF5EC]/90 object-contain p-1.5 shadow-md sm:h-16 sm:w-16"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>

    <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
      <h3 className="hl-serif mb-1.5 text-lg font-semibold normal-case tracking-[0.03em] text-home-ink">
        <Tx k={cardKey(tool.path, "title")} def={tool.title} />
      </h3>
      <p className="mb-4 line-clamp-3 font-home-sans text-[0.9rem] leading-[1.5] text-home-muted">
        <Tx k={cardKey(tool.path, "description")} def={tool.description} />
      </p>

      <Link to={tool.path} className="hl-btn-ghost hl-btn-sm group/btn mt-auto h-9 w-fit">
        <Tx k={cardKey(tool.path, "button")} def={tool.button} />
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
      </Link>
    </div>
  </motion.div>
);

export default memo(ToolCard);
