import React, { useState, useEffect, memo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { InteractiveSolarSystem } from "./InteractiveSolarSystem";
import { PlanetInfoPanel } from "../PlanetInfoPanel";
import {
  Planet,
  getDailyInfluence,
  PlanetaryInfluence,
  ZodiacSign,
} from "@/data/planetaryData";

class PanelBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error(
      "[PlanetInfoPanel crash]",
      err.message,
      "\n",
      info.componentStack,
    );
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

class SceneBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error(
      "[SolarSystem crash]",
      err.message,
      "\n",
      info.componentStack,
    );
  }
  render() {
    if (this.state.crashed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-muted-foreground font-display tracking-wider">
            Scene unavailable — reload to retry
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

const SceneLoader = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-sm text-muted-foreground font-display tracking-wider">
        Loading cosmos...
      </span>
    </div>
  </div>
));
SceneLoader.displayName = "SceneLoader";

export const ScrollytellingHero = () => {
  // Planets are always interactive — there's no scroll-gated reveal stage.
  const canInteract = true;

  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [userZodiac, setUserZodiac] = useState<ZodiacSign>("sagittarius");
  const [dailyInfluence, setDailyInfluence] =
    useState<PlanetaryInfluence | null>(null);

  // Load stored zodiac
  useEffect(() => {
    const stored = localStorage.getItem("userZodiac");
    if (stored) setUserZodiac(stored as ZodiacSign);
  }, []);

  // Update influence when planet is clicked
  useEffect(() => {
    if (selectedPlanet) {
      setDailyInfluence(
        getDailyInfluence(userZodiac, new Date(), selectedPlanet.id),
      );
    } else {
      setDailyInfluence(null);
    }
  }, [selectedPlanet, userZodiac]);

  return (
    <>
      {/* Glassmorphism info panel — fixed, unaffected by scroll */}
      <PanelBoundary key={selectedPlanet?.id ?? "none"}>
        <AnimatePresence>
          {selectedPlanet && dailyInfluence && (
            <PlanetInfoPanel
              key={selectedPlanet.id}
              planet={selectedPlanet}
              influence={dailyInfluence}
              isOpen
              onClose={() => setSelectedPlanet(null)}
              zodiacSign={userZodiac}
            />
          )}
        </AnimatePresence>
      </PanelBoundary>

      {/*
        ── Hero section ───────────────────────────────────────────────────
        Planets rotate automatically in the background. Scrolling behaves
        like a normal page — nothing here reacts to scroll input.
      */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "100vh" }}
      >
        {/* ── Full-screen Three.js canvas — absolutely positioned ── */}
        <div className="absolute inset-0 z-0">
          <Suspense fallback={<SceneLoader />}>
            <SceneBoundary>
              <InteractiveSolarSystem
                selectedPlanet={selectedPlanet}
                onPlanetSelect={setSelectedPlanet}
                canInteract={canInteract}
              />
            </SceneBoundary>
          </Suspense>
        </div>

        {/* ── Hero text ── */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-32 md:pt-44 px-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
            className="text-center"
          >
            <h1
              className="text-center select-none uppercase mx-auto mb-6 flex flex-col justify-between w-full max-w-[1438px] lg:h-[200px] text-[48px] md:text-[68px] lg:text-[88px] leading-[58px] md:leading-[82px] lg:leading-[104px] tracking-[2.4px] md:tracking-[3.6px] lg:tracking-[4.8px] font-bold"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              <span className="text-[#D16B3C] block">Journey Through</span>
              <span className="text-white block">The Cosmos</span>
            </h1>

            <p className="text-base md:text-lg text-foreground/90 font-astra font-normal max-w-xl mx-auto tracking-wider mb-6">
              Discover daily planetary wisdom aligned with your zodiac sign
            </p>
          </motion.div>
        </div>

        {/* ── Scroll indicator + interact hint ── merged into a single
            stacked flex column so the two lines lay out in normal flow
            instead of two independently bottom-anchored blocks (which
            overlapped since their fixed offsets didn't account for each
            other's actual height). */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-3 text-center px-4"
        >
          <p
            className="text-sm font-display tracking-[0.22em] uppercase whitespace-nowrap"
            style={{
              color: "rgba(255,255,255,0.7)",
              textShadow: "0 0 24px rgba(255,200,80,0.5)",
            }}
          >
            ✦ Click a planet to discover today's cosmic influence ✦
          </p>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground font-display tracking-widest uppercase">
              Scroll Downward
            </span>
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-5 h-5 text-primary" />
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScrollytellingHero;
