import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { AstrologyTool } from "@/data/tools";

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
        loading="lazy"
        decoding="async"
      />
    </div>

    <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
      <h3 className="hl-serif mb-1.5 text-lg font-semibold normal-case tracking-[0.03em] text-home-ink">
        {tool.title}
      </h3>
      <p className="mb-4 line-clamp-3 font-home-sans text-[0.9rem] leading-[1.5] text-home-muted">
        {tool.description}
      </p>

      <Link to={tool.path} className="hl-btn-ghost hl-btn-sm group/btn mt-auto h-9 w-fit">
        {tool.button}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
      </Link>
    </div>
  </motion.div>
);

export default memo(ToolCard);
