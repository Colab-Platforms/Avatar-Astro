import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Iceland", "sans-serif"],
        body: ["Iceland", "sans-serif"],
        astra: ["Astra", "Iceland", "sans-serif"],
        // Homepage light theme: Cinzel is already loaded site-wide (index.css @import).
        "home-serif": ["Cinzel", "Georgia", "serif"],
        "home-sans": ["DM Sans", "system-ui", "sans-serif"],
      },
      // Bumped up from Tailwind's stock scale — sitewide text was reading too
      // small across nav, cards, labels, and body copy. Line-heights keep
      // their original proportional ratio to the new sizes.
      fontSize: {
        xs:   ["0.875rem", { lineHeight: "1.25rem" }],     // 14px (Tailwind default: 12px)
        sm:   ["1rem", { lineHeight: "1.5rem" }],           // 16px (Tailwind default: 14px)
        base: ["1.125rem", { lineHeight: "1.75rem" }],      // 18px (Tailwind default: 16px)
        lg:   ["1.25rem", { lineHeight: "1.875rem" }],      // 20px (Tailwind default: 18px)
        xl:   ["1.375rem", { lineHeight: "1.875rem" }],     // 22px (Tailwind default: 20px)
        "2xl": ["1.75rem", { lineHeight: "2.25rem" }],      // 28px (Tailwind default: 24px)
        "3xl": ["2.125rem", { lineHeight: "2.5rem" }],      // 34px (Tailwind default: 30px)
        "4xl": ["2.625rem", { lineHeight: "2.875rem" }],    // 42px (Tailwind default: 36px)
      },
      colors: {
        // Homepage theme. Four approved brand colours; everything else is a
        // mix/opacity of those four (see .home-light in index.css).
        home: {
          cream: "#FFF3EC", // --mb-cream  main background
          ink: "#121212", //   --mb-ink    typography
          rust: "#D05F2F", //  --mb-rust   primary actions, borders, large accents
          orange: "#FE9F30", // --mb-orange secondary highlights (never small text on cream: 1.9:1)
          // derived (mixes of the four above)
          deep: "#A14C28", //  rust 75% + ink 25%   text-safe accent (5.4:1 on cream)
          card: "#FFFAF6", //  lighter surface
          muted: "#54514F", // ink 72% on cream     secondary text (7.2:1)
          line: "#F2CAB7", //  rust 28% on cream    borders
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        cosmic: {
          dark: "hsl(var(--cosmic-dark))",
          charcoal: "hsl(var(--cosmic-charcoal))",
        },
        star: {
          white: "hsl(var(--star-white))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          dim: "hsl(var(--gold-dim))",
          glow: "hsl(var(--gold-glow))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(100px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(100px) rotate(-360deg)" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
        "scale-in": "scale-in 0.4s ease-out forwards",
        orbit: "orbit 20s linear infinite",
        "rotate-slow": "rotate-slow 120s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
