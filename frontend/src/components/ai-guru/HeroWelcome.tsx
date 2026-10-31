import { motion } from "framer-motion";

interface HeroWelcomeProps {
  name: string;
}

const HeroWelcome = ({ name }: HeroWelcomeProps) => (
  <div className="relative flex flex-col items-center px-4 py-10 text-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative mb-6 flex h-32 w-32 items-center justify-center"
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(89,34,9,0.35) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="#F5C76E" strokeOpacity="0.35" strokeWidth="1" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = 100 + Math.cos(a) * 82;
          const y1 = 100 + Math.sin(a) * 82;
          const x2 = 100 + Math.cos(a) * 96;
          const y2 = 100 + Math.sin(a) * 96;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5C76E" strokeOpacity="0.4" strokeWidth="1" />;
        })}
      </motion.svg>
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#592209]/40 bg-[#FBF5EC] text-4xl text-[#301607] shadow-[0_0_40px_rgba(255,157,77,0.4)]">
        ॐ
      </div>
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="font-home-serif text-4xl font-semibold text-foreground md:text-5xl"
    >
      Namaste, {name}
    </motion.h1>

    <motion.p
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.28 }}
      className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground"
    >
      Whatever trouble weighs on your soul – speak openly.
      <br className="hidden sm:block" />
      Divya Margdarshak will understand your situation before suggesting a path forward.
    </motion.p>
  </div>
);

export default HeroWelcome;
