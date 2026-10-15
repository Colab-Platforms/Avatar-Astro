import { motion } from "framer-motion";
import { Star, Users, Award, HeartHandshake } from "lucide-react";

const STATS = [
  { icon: Star, value: "4.9", label: "Rating", extra: "★★★★★" },
  { icon: Users, value: "120K+", label: "Consultations" },
  { icon: Award, value: "40+", label: "Years Experience" },
  { icon: HeartHandshake, value: "98%", label: "Positive Guidance" },
];

const TrustStats = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {STATS.map(({ icon: Icon, value, label, extra }, i) => (
      <motion.div
        key={label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: i * 0.06 }}
        whileHover={{ y: -3 }}
        className="flex flex-col items-center gap-1.5 rounded-[20px] border border-white/[0.08] bg-[#17181F] px-4 py-5 text-center shadow-[0_0_0_rgba(255,157,77,0)] transition-shadow hover:shadow-[0_0_28px_rgba(255,157,77,0.12)]"
      >
        <Icon className="h-5 w-5 text-[#F5C76E]" />
        <div className="font-['Cormorant_Garamond'] text-2xl font-semibold text-white">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-[#6B7280]">{label}</div>
        {extra && <div className="text-xs leading-none text-[#F5C76E]">{extra}</div>}
      </motion.div>
    ))}
  </div>
);

export default TrustStats;
