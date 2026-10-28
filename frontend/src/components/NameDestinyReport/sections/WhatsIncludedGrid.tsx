import { motion } from "framer-motion";
import { Check } from "lucide-react";

const ITEMS = [
  { icon: "🔮", title: "AI Name Meaning", desc: "Decode the hidden energy and vibration of your current name." },
  { icon: "✨", title: "Best Name Spellings", desc: "Receive the top AI-generated spelling recommendations ranked by compatibility." },
  { icon: "🎯", title: "Destiny Compatibility Score", desc: "Discover how well your name aligns with your birth chart and life path." },
  { icon: "🪐", title: "Planet Compatibility", desc: "See how the seven major planets influence your name's vibration." },
  { icon: "💼", title: "Career & Wealth Analysis", desc: "AI insights into career growth, leadership, money and business potential." },
  { icon: "❤️", title: "Relationship Energy", desc: "Communication, emotional balance, marriage and family compatibility." },
  { icon: "🎨", title: "Lucky Colors & Lucky Dates", desc: "Personalized colors, dates and favorable periods." },
  { icon: "🔢", title: "Lucky Numbers", desc: "Lucky numbers for personal and professional life." },
  { icon: "📿", title: "Personalized Remedies", desc: "Mantras, gemstones, donations and spiritual guidance." },
  { icon: "✍️", title: "Signature Analysis", desc: "Recommendations to optimize your signature style." },
  { icon: "🏢", title: "Business Name Suggestions", desc: "AI-generated business and brand name ideas aligned with your numerology." },
  { icon: "📄", title: "Premium PDF Report", desc: "Download your professionally designed Cosmic Blueprint with lifetime access." },
];

export default function WhatsIncludedGrid() {
  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'Astra','Cinzel',serif" }}
      >
        📋 Everything Included in Your Cosmic Blueprint
      </h3>
      <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-8 text-sm sm:text-base">
        Your premium report combines AI, Vedic Astrology, Numerology and personalized insights into
        one comprehensive experience.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            className="glass-card-hover rounded-2xl p-5 sm:p-6 flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{item.icon}</div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wide">
                <Check size={10} /> Included
              </span>
            </div>
            <h4 className="font-bold text-foreground text-base mb-1.5">{item.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
