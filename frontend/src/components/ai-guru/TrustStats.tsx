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
        className="flex flex-col items-center gap-1.5 rounded-[20px] border border-primary/15 bg-[#FBF5EC] px-4 py-5 text-center shadow-[0_0_0_rgba(255,157,77,0)] transition-shadow hover:shadow-[0_0_28px_rgba(255,157,77,0.12)]"
      >
        <Icon className="h-5 w-5 text-[#301607]" />
        <div className="font-home-serif text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        {extra && <div className="text-xs leading-none text-[#301607]">{extra}</div>}
      </motion.div>
    ))}
  </div>
);

export default TrustStats;
