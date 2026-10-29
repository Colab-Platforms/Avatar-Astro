import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useBackOverride } from "../context/NavigationContext";
import {
  defaultPalmAnalysisEngine, loadImageFromDataUrl,
  type HandLandmarks, type HandType, type PalmAnalysisResult, type PalmLine,
} from "@/lib/palmAnalysis";
import { ScanSequence } from "@/components/palm/ScanSequence";
import { PalmLineOverlay } from "@/components/palm/PalmLineOverlay";
import { MetricDashboard, type DashboardMetric } from "@/components/palm/MetricDashboard";


// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "landing" | "processing" | "retake" | "scanning" | "results" | "live";

interface PalmResult {
  handType: string; handElement: string; dominance: string;
  score: number; confidence: number;
  lines: { heart: LineData; head: LineData; life: LineData; fate: LineData };
  mounts: MountData[];
  personality: TraitScore[];
  love: string[]; loveStrengths: string[]; loveChallenges: string[];
  career: string[]; careerTypes: string[];
  timeline: TimelineItem[];
  hiddenStrengths: string[];
  recommendations: RecoItem[];
  summary: string;
}
interface LineData { length: string; depth: string; clarity: string; interpretation: string; strengths: string[]; challenges: string[]; recommendations: string }
interface MountData { name: string; planet: string; strength: number; meaning: string }
interface TraitScore { name: string; score: number; icon: string }
interface TimelineItem { phase: string; years: string; theme: string; insight: string }
interface RecoItem { category: string; icon: string; tip: string }

// ─── Hand type reference (shown on landing + live scan so users know what
// the scanner is classifying against) ─────────────────────────────────────
const HAND_TYPE_LEGEND: { type: HandType; emoji: string; label: string; traits: string; shape: string }[] = [
  { type: "Earth", emoji: "🌍", label: "Earth Hand", traits: "Practical, stable, grounded, reliable", shape: "Square palm, short fingers" },
  { type: "Air",   emoji: "💨", label: "Air Hand",   traits: "Intelligent, curious, communicative", shape: "Square palm, long fingers" },
  { type: "Water", emoji: "🌊", label: "Water Hand", traits: "Emotional, intuitive, artistic", shape: "Long palm, long fingers" },
  { type: "Fire",  emoji: "🔥", label: "Fire Hand",  traits: "Energetic, ambitious, spontaneous", shape: "Rectangular palm, short fingers" },
];

// ─── Live blueprint skeleton — connects the 21 MediaPipe hand landmarks into
// the finger/palm topology so the live camera view can render a real-time
// tracking overlay (not a canned animation — these edges follow the actual
// detected joints frame to frame).
function handSkeletonEdges(lm: HandLandmarks): [{ x: number; y: number }, { x: number; y: number }][] {
  const fingers = [lm.thumb, lm.index, lm.middle, lm.ring, lm.pinky];
  const edges: [{ x: number; y: number }, { x: number; y: number }][] = [];
  for (const finger of fingers) {
    edges.push([lm.wrist, finger[0]]);
    for (let i = 0; i < finger.length - 1; i++) edges.push([finger[i], finger[i + 1]]);
  }
  // knuckle row, so the palm reads as a connected plane rather than 5 loose spokes
  const knuckles = [lm.thumb[0], lm.index[0], lm.middle[0], lm.ring[0], lm.pinky[0]];
  for (let i = 0; i < knuckles.length - 1; i++) edges.push([knuckles[i], knuckles[i + 1]]);
  return edges;
}

// ─── Deterministic result generator ──────────────────────────────────────────
// `real`, when provided, comes from actual MediaPipe-detected hand geometry
// (see lib/palmAnalysis) rather than the seed — hand type and dominance are
// then genuine measurements, not a random pick.
function generatePalmResult(seed: number, real?: { handType: HandType; dominance: PalmResult["dominance"] }): PalmResult {
  const s = (seed % 4);
  const handTypes = [
    { type: "Earth Hand", element: "Earth 🌍", traits: "Practical, stable, grounded, reliable, steadfast" },
    { type: "Air Hand",   element: "Air 💨",   traits: "Intelligent, logical, curious, communicative, analytical" },
    { type: "Water Hand", element: "Water 🌊", traits: "Emotional, sensitive, artistic, empathetic, intuitive" },
    { type: "Fire Hand",  element: "Fire 🔥",  traits: "Energetic, passionate, ambitious, spontaneous, bold" },
  ];
  const ht = real ? handTypes.find((h) => h.type.startsWith(real.handType)) ?? handTypes[s] : handTypes[s];
  return {
    handType: ht.type, handElement: ht.element,
    dominance: real?.dominance ?? (seed % 2 === 0 ? "Right (Active)" : "Left (Receptive)"),
    score: 7.8 + (seed % 3) * 0.4,
    confidence: 91 + (seed % 8),
    lines: {
      heart: {
        length: seed%2===0?"Long & curved":"Medium & straight",
        depth: "Deep", clarity: "Clear",
        interpretation: "Your heart line reveals a deeply emotional and loyal nature. You form lasting bonds and invest yourself fully in relationships. Emotional intelligence is one of your greatest gifts — you read people and situations with remarkable accuracy.",
        strengths: ["Deep emotional loyalty","Strong empathy","Passionate connections","Intuitive emotional awareness"],
        challenges: ["Tendency to over-give","Difficulty letting go","Emotional sensitivity"],
        recommendations: "Protect your emotional energy. Set healthy boundaries while honoring your natural depth of feeling."
      },
      head: {
        length: seed%3===0?"Long, extending across palm":"Medium with slight curve",
        depth: "Moderate", clarity: "Clear with minor breaks",
        interpretation: "Your head line indicates a sharp, creative mind that balances logic with imagination. You are a strategic thinker who considers multiple angles before deciding. Your intelligence is both analytical and intuitive.",
        strengths: ["Strategic thinking","Creative problem solving","Strong focus","Intellectual curiosity"],
        challenges: ["Overthinking at times","Difficulty with quick decisions","Analysis paralysis"],
        recommendations: "Trust your instincts alongside your analytical mind. Some of your best insights come from your gut."
      },
      life: {
        length: "Long, sweeping arc", depth: "Deep & strong", clarity: "Clear",
        interpretation: "Your life line speaks of strong vitality and adaptability. It does not predict lifespan, but rather reflects the quality, richness, and transformative depth of your life journey. Major life changes become stepping stones for you.",
        strengths: ["High physical vitality","Resilience through change","Strong personal growth","Adaptability"],
        challenges: ["Tendency to take on too much","Need for periodic recovery","Restless energy"],
        recommendations: "Honor your body's need for rest as much as your drive for activity. Balance fuels your greatest achievements."
      },
      fate: {
        length: seed%2===0?"Strong, runs from base to middle finger":"Starts mid-palm, indicating self-made path",
        depth: "Deep", clarity: seed%3===0?"Clear":"Moderate with branches",
        interpretation: "Your fate line indicates a clear sense of purpose and direction. You are not one to drift — there is an inner compass guiding you. Whether shaped by destiny or personal will, your professional path carries meaning and momentum.",
        strengths: ["Clear life direction","Career focus","Natural leadership","Purpose-driven work"],
        challenges: ["Rigidity in plans","Difficulty pivoting","External pressure sensitivity"],
        recommendations: "Your greatest career breakthroughs come when you align passion with discipline. Trust the path even when it curves."
      },
    },
    mounts: [
      { name: "Mount of Jupiter", planet: "Jupiter", strength: 78 + seed%15, meaning: "Strong ambition, natural leadership and wisdom. You are drawn to positions of influence and guide others with authority." },
      { name: "Mount of Saturn",  planet: "Saturn",  strength: 65 + seed%20, meaning: "Responsibility and perseverance define your career approach. You build slowly and surely toward lasting success." },
      { name: "Mount of Sun",     planet: "Sun",     strength: 82 + seed%12, meaning: "Creative flair and a magnetic personality draw recognition and fame. You shine naturally in public-facing roles." },
      { name: "Mount of Mercury", planet: "Mercury", strength: 70 + seed%18, meaning: "Sharp business acumen and eloquent communication. You excel in negotiation, sales, and intellectual pursuits." },
      { name: "Mount of Venus",   planet: "Venus",   strength: 75 + seed%16, meaning: "A rich capacity for love, beauty, and sensory pleasure. Relationships and aesthetics play a central role in your happiness." },
      { name: "Mount of Moon",    planet: "Moon",    strength: 68 + seed%22, meaning: "Deep intuition and a vivid imagination. You are emotionally receptive and often experience prophetic insights." },
    ],
    personality: [
      { name:"Leadership",            score: 78+seed%18, icon:"👑" },
      { name:"Communication",         score: 82+seed%12, icon:"💬" },
      { name:"Creativity",            score: 75+seed%20, icon:"🎨" },
      { name:"Discipline",            score: 70+seed%22, icon:"⚡" },
      { name:"Emotional Intelligence",score: 85+seed%10, icon:"❤️" },
      { name:"Adaptability",          score: 80+seed%15, icon:"🌊" },
      { name:"Confidence",            score: 72+seed%20, icon:"✨" },
      { name:"Decision Making",       score: 76+seed%18, icon:"🎯" },
    ],
    love: ["You love deeply and with full commitment","Loyalty is your highest relationship value","You are drawn to partners who match your emotional depth","You give generously in relationships and expect sincerity in return"],
    loveStrengths: ["Intense emotional loyalty","Empathetic listening","Romantic depth","Long-term commitment"],
    loveChallenges: ["Vulnerability to heartbreak","High expectations","Difficulty with casual connections"],
    career: ["Natural born communicator and strategist","Excel in roles requiring both creativity and analysis","Leadership emerges through trust and example","Work best when values align with profession"],
    careerTypes: ["Creative Direction","Consulting & Strategy","Education & Mentorship","Entrepreneurship","Healing & Wellness","Arts & Communications"],
    timeline: [
      { phase:"Early Life",    years:"0–20",  theme:"Learning & Foundation",    insight:"A period of deep observation, learning, and building the emotional and intellectual foundations that define your unique perspective." },
      { phase:"Young Adult",   years:"20–35", theme:"Growth & Ambition",        insight:"A dynamic phase of exploration, bold choices, and discovering your authentic path. Career and relationships take shape through meaningful experiences." },
      { phase:"Mid-Life",      years:"35–50", theme:"Expansion & Achievement",  insight:"The period of greatest professional and personal impact. Your accumulated wisdom begins to create visible, lasting results." },
      { phase:"Later Years",   years:"50+",   theme:"Wisdom & Contribution",    insight:"A season of deepened purpose, meaningful connections, and sharing your unique gifts with the world from a place of earned authority." },
    ],
    hiddenStrengths: [
      "Natural ability to read people and situations before others notice",
      "Reservoir of resilience that activates under pressure",
      "Creative problem-solving that appears effortless to others",
      "Magnetic presence that makes others feel seen and heard",
      "Strategic patience — you know when to act and when to wait",
    ],
    recommendations: [
      { category:"Career Development",    icon:"💼", tip:"Seek roles that blend creativity with strategy. Your best work happens at the intersection of ideas and execution." },
      { category:"Relationship Growth",   icon:"❤️", tip:"Communicate your needs clearly. Your depth is a gift — let the right people truly know you." },
      { category:"Personal Growth",       icon:"🌱", tip:"Dedicate 20 minutes daily to stillness. Your clearest insights emerge in quiet moments." },
      { category:"Communication",         icon:"💬", tip:"Your natural eloquence is powerful. Practice active listening to match your expressive gifts." },
      { category:"Financial Habits",      icon:"💰", tip:"Build a long-term wealth strategy. Your steady discipline, when applied to finances, creates remarkable security." },
      { category:"Wellness & Vitality",   icon:"🌿", tip:"Honor your body's energy cycles. Movement, nature, and rest are not luxuries — they are your fuel." },
    ],
    summary: `Your palm reveals a ${ht.type} — ${ht.traits}. The lines of your hand tell the story of someone with extraordinary emotional intelligence, a sharp and creative mind, and a life path marked by purposeful growth. Your heart speaks deeply, your mind moves strategically, and your fate line confirms that the path ahead is lit by genuine purpose.`,
  };
}

// Blends real geometry (line curvature, mount strength — from actual MediaPipe
// detection) with the existing seeded personality scores, for the dashboard.
function buildDashboardMetrics(result: PalmResult, analysis: PalmAnalysisResult): DashboardMetric[] {
  const curviness = (l: PalmLine) => l.length / Math.max(l.straightLength, 0.001);
  const mountStrength = (planet: string) => analysis.mounts.find((m) => m.planet === planet)?.strength ?? 60;
  const clampScore = (n: number) => Math.max(35, Math.min(98, Math.round(n)));
  const trait = (name: string) => result.personality.find((p) => p.name === name)?.score ?? 75;

  const heart = analysis.lines.heart, fate = analysis.lines.fate, life = analysis.lines.life, head = analysis.lines.head;

  return [
    { label: "Overall Palm Score", icon: "🤚", color: "#592209", value: clampScore(result.score * 10) },
    { label: "Love & Relationships", icon: "❤️", color: "#592209", value: clampScore(55 + curviness(heart) * 22) },
    { label: "Career", icon: "💼", color: "#592209", value: clampScore(55 + curviness(fate) * 18) },
    { label: "Health & Vitality", icon: "🌿", color: "#301607", value: clampScore(55 + curviness(life) * 20) },
    { label: "Finance", icon: "💰", color: "#6B4A37", value: clampScore(mountStrength("Mercury")) },
    { label: "Leadership", icon: "👑", color: "#592209", value: clampScore(trait("Leadership")) },
    { label: "Creativity", icon: "🎨", color: "#592209", value: clampScore(trait("Creativity")) },
    { label: "Spiritual Growth", icon: "🔮", color: "#592209", value: clampScore((mountStrength("Moon") + mountStrength("Sun")) / 2) },
    { label: "Decision Making", icon: "🎯", color: "#592209", value: clampScore(trait("Decision Making") - (curviness(head) - 1) * 40) },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreBar({ value, color = "#592209" }: { value: number; color?: string }) {
  return (
    <div style={{ background: "rgba(89,34,9,0.2)", borderRadius: 6, height: 8, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(value,100)}%`, background: `linear-gradient(90deg, ${color}, #592209)`, borderRadius: 6, boxShadow: `0 0 8px ${color}60`, transition: "width 1.2s ease" }} />
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <h2 style={{ color: "#592209", fontSize: 15, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>{title}</h2>
    </div>
  );
}

// ─── Live blueprint scanner overlay ───────────────────────────────────────────
// Renders on top of the raw <video> element: a cyan hand-tracking skeleton
// anchored to real MediaPipe landmarks (updates each detection tick), a
// sweeping scanner beam, blueprint grid, and targeting corner brackets.
// `locked` (green) means a stable, high-quality palm was just found and a
// capture is about to fire; otherwise it stays in amber "searching" mode.
function LiveBlueprintOverlay({ landmarks, locked }: { landmarks: HandLandmarks | null; locked: boolean }) {
  const edges = useMemo(() => (landmarks ? handSkeletonEdges(landmarks) : []), [landmarks]);
  const points = useMemo(() => {
    if (!landmarks) return [];
    return [landmarks.wrist, ...landmarks.thumb, ...landmarks.index, ...landmarks.middle, ...landmarks.ring, ...landmarks.pinky];
  }, [landmarks]);
  const tint = locked ? "#4ade80" : "#7fc4ff";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes lp-beam-sweep{0%{top:-6%}100%{top:106%}}
        @keyframes lp-pulse-dot{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.7)}}
        @keyframes lp-grid-drift{0%{background-position:0 0}100%{background-position:0 40px}}
        .lp-edge{transition:x1 0.45s ease,y1 0.45s ease,x2 0.45s ease,y2 0.45s ease,stroke 0.3s ease}
        .lp-joint{transition:cx 0.45s ease,cy 0.45s ease,fill 0.3s ease}
      `}</style>

      {/* Blueprint grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(89,34,9,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(89,34,9,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        animation: "lp-grid-drift 7s linear infinite",
      }} />

      {/* Corner targeting brackets */}
      {[
        { top: 22, left: 22, borderTop: `2px solid ${tint}`, borderLeft: `2px solid ${tint}` },
        { top: 22, right: 22, borderTop: `2px solid ${tint}`, borderRight: `2px solid ${tint}` },
        { bottom: 22, left: 22, borderBottom: `2px solid ${tint}`, borderLeft: `2px solid ${tint}` },
        { bottom: 22, right: 22, borderBottom: `2px solid ${tint}`, borderRight: `2px solid ${tint}` },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 34, height: 34, ...s, filter: `drop-shadow(0 0 4px ${tint}aa)`, transition: "border-color 0.3s ease" }} />
      ))}

      {/* Sweeping scan beam — pauses once a palm is locked */}
      {!locked && (
        <div style={{
          position: "absolute", left: 0, right: 0, height: "14%",
          background: `linear-gradient(180deg, transparent, ${tint}22, ${tint}55, ${tint}22, transparent)`,
          animation: "lp-beam-sweep 2.6s ease-in-out infinite",
          filter: "blur(1px)",
        }} />
      )}

      {/* Real-time hand skeleton, anchored to actual detected landmarks */}
      {landmarks && (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {edges.map((e, i) => (
            <line key={i} className="lp-edge" x1={e[0].x} y1={e[0].y} x2={e[1].x} y2={e[1].y}
              stroke={tint} strokeWidth={0.0016} strokeOpacity={0.85} vectorEffect="non-scaling-stroke"
              style={{ filter: `drop-shadow(0 0 2px ${tint})` }} />
          ))}
          {points.map((p, i) => (
            <circle key={i} className="lp-joint" cx={p.x} cy={p.y} r={0.008} fill={tint}
              vectorEffect="non-scaling-stroke"
              style={{ filter: `drop-shadow(0 0 3px ${tint})`, animation: `lp-pulse-dot 1.5s ease-in-out ${i * 0.02}s infinite` }} />
          ))}
        </svg>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PalmReading() {
  const [stage, setStage]           = useState<Stage>("landing");
  const [imageUrl, setImageUrl]     = useState<string | null>(null); // preprocessed (cropped/aligned/enhanced) palm photo
  const [imageDims, setImageDims]   = useState({ width: 3, height: 4 });
  const [analysis, setAnalysis]     = useState<PalmAnalysisResult | null>(null);
  const [result, setResult]         = useState<PalmResult | null>(null);
  const [activeLineTab, setActiveLineTab] = useState<"heart"|"head"|"life"|"fate">("heart");
  const [processingMessage, setProcessingMessage] = useState("Initializing AI Vision Engine...");
  const [processingPct, setProcessingPct]         = useState(0);
  const [retakeMessage, setRetakeMessage]         = useState<string | null>(null);
  const [liveMessage, setLiveMessage]             = useState("Align your palm within the frame. Keep fingers relaxed and palm visible.");
  const [cameraError, setCameraError]             = useState<string | null>(null);
  const [cameraRetryTick, setCameraRetryTick]     = useState(0);
  const [cameraReady, setCameraReady]             = useState(false);
  const [liveLandmarks, setLiveLandmarks]         = useState<HandLandmarks | null>(null);
  const [liveLocked, setLiveLocked]               = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimeoutRef = useRef<number | null>(null);

  const cleanupCamera = useCallback(() => {
    if (captureTimeoutRef.current) {
      window.clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setLiveLandmarks(null);
    setLiveLocked(false);
  }, []);

  // Back button returns to landing from any non-landing stage
  const resetToLanding = useCallback(() => {
    setStage("landing");
    setResult(null);
    setAnalysis(null);
    setImageUrl(null);
    setRetakeMessage(null);
    setProcessingPct(0);
  }, []);
  useBackOverride(stage !== "landing" ? resetToLanding : null, [stage]);

  const runAnalysisPipeline = useCallback(async (dataUrl: string) => {
    setStage("processing");
    setRetakeMessage(null);
    setProcessingPct(0);
    setProcessingMessage("Initializing AI Vision Engine...");
    try {
      const sourceImg = await loadImageFromDataUrl(dataUrl);

      await defaultPalmAnalysisEngine.ensureReady((pct) => setProcessingPct(pct * 0.45));
      setProcessingMessage("Detecting your palm...");
      const quality = await defaultPalmAnalysisEngine.checkQuality(sourceImg);
      setProcessingPct(60);

      if (!quality.ok || !quality.landmarks) {
        setRetakeMessage(quality.message ?? "We couldn't get a clear reading from this photo.");
        setStage("retake");
        return;
      }

      setProcessingMessage("Cropping, aligning and enhancing image...");
      const processed = await defaultPalmAnalysisEngine.preprocess(sourceImg, quality.landmarks);
      setProcessingPct(82);
      const processedImg = await loadImageFromDataUrl(processed.dataUrl);

      setProcessingMessage("Analyzing palm geometry...");
      const fullAnalysis = await defaultPalmAnalysisEngine.analyze(processedImg, quality.landmarks);
      setProcessingPct(100);

      setImageUrl(processed.dataUrl);
      setImageDims({ width: processed.width, height: processed.height });
      setAnalysis(fullAnalysis);
      setResult(generatePalmResult(Date.now() % 1000, {
        handType: fullAnalysis.geometry.handType,
        dominance: fullAnalysis.geometry.dominance,
      }));
      setStage("scanning");
    } catch (err) {
      console.error("[PalmReading] analysis pipeline failed", err);
      setRetakeMessage("The AI vision engine couldn't load — check your connection and try again.");
      setStage("retake");
    }
  }, []);

  useEffect(() => {
    if (stage !== "live") return;

    let isActive = true;

    async function captureFrame() {
      const video = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (!video || !canvas) return;

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);

      try {
        const quality = await defaultPalmAnalysisEngine.checkQuality(canvas);
        if (!isActive || stage !== "live") return;

        // Surface the live skeleton the instant *any* hand is found, even
        // before it clears the capture quality gate — this is what makes the
        // blueprint tracking feel real-time rather than only flashing at capture.
        setLiveLandmarks(quality.landmarks);

        if (!quality.ok || !quality.landmarks) {
          setLiveLocked(false);
          setLiveMessage(quality.message ?? "A clear palm was not detected yet. Keep it steady inside the frame.");
          captureTimeoutRef.current = window.setTimeout(captureFrame, 900);
          return;
        }

        setLiveLocked(true);
        setLiveMessage("Palm detected. Capturing the best scan...");
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setStage("processing");
        runAnalysisPipeline(dataUrl);
      } catch (err) {
        console.error("[PalmReading] live capture failed", err);
        if (!isActive) return;
        setLiveLocked(false);
        setLiveMessage("Still scanning... move your palm slowly and hold it steady.");
        captureTimeoutRef.current = window.setTimeout(captureFrame, 1100);
      }
    }

    // Phones have a rear ("environment") camera worth preferring for a palm
    // scan; laptops/desktops usually only expose a front-facing webcam. A
    // bare `facingMode: "environment"` constraint is rejected outright
    // (OverconstrainedError) on those devices, so we prefer it but always
    // fall back to whatever camera is actually available rather than failing.
    async function openCameraStream(): Promise<MediaStream> {
      const dims = { width: { ideal: 1280 }, height: { ideal: 720 } };
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, ...dims },
          audio: false,
        });
      } catch (err) {
        if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
          throw err; // permission denied — retrying with different constraints won't help
        }
        return navigator.mediaDevices.getUserMedia({ video: dims, audio: false });
      }
    }

    async function initLiveCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported in this browser.");
        return;
      }

      setCameraError(null);
      setLiveMessage("Preparing live palm scanner...");
      setProcessingPct(0);

      try {
        const stream = await openCameraStream();
        if (!isActive) return;

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraReady(true);
        setLiveMessage("Hold your palm in the frame. Scanning for your hand structure...");
        await defaultPalmAnalysisEngine.ensureReady((pct) => setProcessingPct(Math.round(pct * 0.6)));
        captureFrame();
      } catch (err) {
        console.error("[PalmReading] live camera failed", err);
        if (!isActive) return;
        const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        setCameraError(
          denied
            ? "Camera permission was denied. Allow camera access in your browser's site settings, then try again."
            : "Could not access your camera. Make sure no other app is using it, then try again."
        );
      }
    }

    initLiveCamera();
    return () => {
      isActive = false;
      cleanupCamera();
    };
  }, [stage, cameraRetryTick, runAnalysisPipeline, cleanupCamera]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => runAnalysisPipeline(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-selecting the same file after a retake
  };

  const sec: React.CSSProperties = { background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.18)", borderRadius: 24, padding: "36px 40px", marginBottom: 28 };
  const card: React.CSSProperties = { background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.14)", borderRadius: 16, padding: "24px" };
  const goldBtn: React.CSSProperties = { background: "#F5E9D6", color: "#000", fontWeight: 800, fontSize: 16, letterSpacing: "0.1em", padding: "16px 36px", borderRadius: 32, border: "none", cursor: "pointer", boxShadow: "0 0 24px rgba(89,34,9,0.4)" };

  // Shared across landing + retake so both can trigger the same upload dialog.
  const fileInput = <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />;

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (stage === "landing") return (
    <div>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(89,34,9,0.3)}50%{box-shadow:0 0 50px rgba(89,34,9,0.7)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fade-in-hero-img{from{opacity:0;transform:translateY(16px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .pr-card:hover{transform:translateY(-6px);border-color:rgba(89,34,9,0.5)!important;transition:all 0.3s ease}
        .pr-card{transition:all 0.3s ease}
        .pr-hero-img-wrap{display:inline-block;width:480px;max-width:92vw;animation:float 5s ease-in-out infinite,pulse-glow 4s ease-in-out infinite,fade-in-hero-img 0.9s ease 0.15s both}
        @media (max-width:1024px){.pr-hero-img-wrap{width:380px}}
        @media (max-width:640px){.pr-hero-img-wrap{width:280px}}
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px", color: "#301607" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 72, animation: "fade-in 0.7s ease" }}>
          <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 16, fontWeight: 600 }}>✦ PREMIUM AI CONSULTATION ✦</div>
          <h1 style={{ fontSize: 58, fontWeight: 900, color: "#301607", letterSpacing: "0.06em", margin: "0 0 20px", lineHeight: 1.1 }}>
            AI Palm Reading<br/>
            <span style={{ background: "#592209", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>Analysis</span>
          </h1>
          <p style={{ fontSize: 20, color: "rgba(48,22,7,0.72)", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.8 }}>
            Discover your personality, relationships, career path, wealth potential, and life journey through advanced AI-powered palm analysis rooted in ancient Vedic palmistry.
          </p>
          {/* Premium palm hero image */}
          <div className="pr-hero-img-wrap" style={{ marginBottom: 48, marginTop: 8, borderRadius: 28 }}>
            <img
              src="/images/palm-reading/premium-palm.jpeg"
              alt="Glowing AI-analyzed palm with mystical energy lines"
              loading="eager"
              decoding="async"
              style={{ width: "100%", height: "auto", display: "block", borderRadius: 28 }}
            />
          </div>
        </div>

        {/* Upload cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 28 }}>
          {/* Upload */}
          <div className="pr-card" style={{ ...sec, textAlign: "center", cursor: "pointer", marginBottom: 0 }} onClick={() => fileRef.current?.click()}>
            {fileInput}
            <div style={{ fontSize: 56, marginBottom: 20 }}>🖼️</div>
            <h3 style={{ color: "#592209", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Upload Palm Photo</h3>
            <p style={{ color: "#592209", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>Upload an existing photo of your palm from your device for instant analysis.</p>
            <button style={goldBtn}>📤 Upload Photo</button>
          </div>
          {/* Live scan */}
          <div className="pr-card" style={{ ...sec, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📷</div>
            <h3 style={{ color: "#592209", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Live Palm Scan</h3>
            <p style={{ color: "#592209", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>Use your camera for a real-time palm scan with a live blueprint hand-tracking overlay.</p>
            <button style={goldBtn} onClick={() => setStage("live")}>📱 Start Live Scan</button>
          </div>
        </div>

        {/* Guidelines */}
        <div style={sec}>
          <SectionTitle icon="📋" title="Photo & Scan Guidelines for Best Results"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={card}>
              <div style={{ color: "#301607", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>✅ IDEAL</div>
              {["Full palm clearly visible","Bright, even natural lighting","Fingers slightly spread apart","Palm centered in frame","Sharp, high-resolution image"].map(g=>(
                <div key={g} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#301607", fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 15, color: "rgba(48,22,7,0.8)" }}>{g}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ color: "#9B2C1D", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>❌ AVOID</div>
              {["Blurry or out-of-focus image","Dark or shadowed lighting","Fingers closed or curled","Palm partially cropped","Low resolution photos"].map(b=>(
                <div key={b} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#9B2C1D", fontSize: 16 }}>✗</span>
                  <span style={{ fontSize: 15, color: "rgba(48,22,7,0.8)" }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hand type legend */}
        <div style={sec}>
          <SectionTitle icon="🤲" title="Hand Structures We Recognize"/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {HAND_TYPE_LEGEND.map(h=>(
              <div key={h.type} style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{h.emoji}</div>
                <div style={{ color: "#592209", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{h.label}</div>
                <div style={{ color: "rgba(48,22,7,0.72)", fontSize: 11, marginBottom: 8 }}>{h.shape}</div>
                <div style={{ color: "#592209", fontSize: 13, lineHeight: 1.5 }}>{h.traits}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line legend */}
        <div style={sec}>
          <SectionTitle icon="🖐️" title="What We Analyse"/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { line: "Heart Line", color: "#9B2C1D", desc: "Emotions, love & relationships" },
              { line: "Head Line",  color: "#592209", desc: "Intelligence & thinking patterns" },
              { line: "Life Line",  color: "#301607", desc: "Vitality & personal growth" },
              { line: "Fate Line",  color: "#592209", desc: "Career, destiny & purpose" },
            ].map(l=>(
              <div key={l.line} style={{ ...card, textAlign: "center" }}>
                <div style={{ width: 40, height: 4, background: l.color, borderRadius: 2, margin: "0 auto 12px", boxShadow: `0 0 10px ${l.color}` }}/>
                <div style={{ color: l.color, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{l.line}</div>
                <div style={{ color: "#592209", fontSize: 13, lineHeight: 1.5 }}>{l.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { item: "Palm Shape", icon: "🤚" },{ item: "7 Mounts", icon: "⛰️" },
              { item: "Hand Dominance", icon: "✋" },{ item: "Finger Structure", icon: "☝️" },
            ].map(i=>(
              <div key={i.item} style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{i.icon}</div>
                <div style={{ color: "#592209", fontWeight: 600, fontSize: 14 }}>{i.item}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  // ── PROCESSING (real detection + preprocessing running) ───────────────────
  if (stage === "processing") return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", color: "#301607" }}>
        <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ AI VISION ENGINE ✦</div>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid rgba(89,34,9,0.18)", borderTopColor: "#592209", animation: "spin 0.9s linear infinite", marginBottom: 28 }}/>
        <div style={{ color: "#592209", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 22, textAlign: "center" }}>{processingMessage}</div>
        <div style={{ width: "100%", maxWidth: 320, height: 6, background: "rgba(89,34,9,0.2)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${processingPct}%`, background: "linear-gradient(90deg,#592209,#E58A45)", borderRadius: 6, boxShadow: "0 0 10px rgba(89,34,9,0.5)", transition: "width 0.3s ease" }}/>
        </div>
      </div>
    </div>
  );

  // ── LIVE SCAN ────────────────────────────────────────────────────────────
  if (stage === "live") return (
    <div>
      <style>{`@keyframes pulse-glow{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
      {fileInput}
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", color: "#301607" }}>
        <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ LIVE PALM SCANNER ✦</div>
        <div style={{ width: "100%", maxWidth: 880, marginBottom: 28, position: "relative", borderRadius: 26, overflow: "hidden", border: "2px solid rgba(89,34,9,0.25)", boxShadow: "0 0 40px rgba(89,34,9,0.16)" }}>
          <video
            ref={videoRef}
            style={{ width: "100%", height: "auto", display: "block", background: "#FBF5EC" }}
            playsInline
            muted
          />
          {cameraReady && <LiveBlueprintOverlay landmarks={liveLandmarks} locked={liveLocked} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #FBF5EC, transparent 30%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: 18, top: 18, right: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: "#301607", textAlign: "left", maxWidth: 520 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: liveLocked ? "#4ade80" : "#e8b23f",
                  boxShadow: `0 0 8px ${liveLocked ? "#4ade80" : "#e8b23f"}`,
                  animation: "pulse-glow 1.4s ease-in-out infinite",
                }} />
                <span style={{ fontSize: 13, color: liveLocked ? "#86efac" : "rgba(89,34,9,0.9)", letterSpacing: "0.2em", fontWeight: 700 }}>
                  {liveLocked ? "PALM LOCKED" : "SCANNING"}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{liveMessage}</div>
              {liveLandmarks && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{ background: "#FBF5EC", border: "1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#6B4A37" }}>
                    ✋ {liveLandmarks.handedness} Hand
                  </span>
                  <span style={{ background: "#FBF5EC", border: "1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#6B4A37" }}>
                    Confidence {Math.round(liveLandmarks.confidence * 100)}%
                  </span>
                  <span style={{ background: "#FBF5EC", border: "1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#6B4A37" }}>
                    21/21 Landmarks Tracked
                  </span>
                </div>
              )}
            </div>
            <button
              style={{ ...goldBtn, background: "rgba(89,34,9,0.08)", color: "#301607", boxShadow: "none" }}
              onClick={() => { cleanupCamera(); resetToLanding(); }}
            >
              ✕ Cancel Scan
            </button>
          </div>
        </div>
        {cameraError ? (
          <div style={{ maxWidth: 640, marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ color: "#6B4A37", fontSize: 15 }}>{cameraError}</div>
            <button style={goldBtn} onClick={() => { setCameraError(null); setCameraRetryTick(t => t + 1); }}>🔄 Try Again</button>
          </div>
        ) : (
          <div style={{ maxWidth: 640, marginTop: 24, color: "rgba(48,22,7,0.75)", fontSize: 15, lineHeight: 1.7 }}>
            Keep your palm centered, fingers slightly spread, and avoid strong reflections. The blueprint scanner locks on and captures automatically once detection is stable.
          </div>
        )}
        {/* Hand type reference while the user waits for a stable lock */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 28, maxWidth: 880 }}>
          {HAND_TYPE_LEGEND.map(h => (
            <div key={h.type} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.16)", borderRadius: 20, padding: "6px 14px" }}>
              <span style={{ fontSize: 16 }}>{h.emoji}</span>
              <span style={{ fontSize: 12, color: "rgba(48,22,7,0.72)" }}>{h.label}</span>
            </div>
          ))}
        </div>
      </div>
      <canvas ref={previewCanvasRef} style={{ display: "none" }} />
    </div>
  );

  // ── RETAKE (quality gate failed, or engine couldn't load) ─────────────────
  if (stage === "retake") return (
    <div>
      {fileInput}
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", color: "#301607" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🖐️</div>
        <h2 style={{ color: "#301607", fontSize: 26, fontWeight: 800, marginBottom: 14 }}>Let's Try That Again</h2>
        <p style={{ color: "#592209", fontSize: 16, maxWidth: 440, marginBottom: 32, lineHeight: 1.7 }}>
          {retakeMessage ?? "We couldn't get a clear reading from this photo."}
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button style={goldBtn} onClick={() => fileRef.current?.click()}>📤 Upload Another Photo</button>
          <button style={{ ...goldBtn, background: "rgba(89,34,9,0.12)", color: "#592209", boxShadow: "none", border: "1px solid rgba(89,34,9,0.35)" }} onClick={resetToLanding}>← Back</button>
        </div>
      </div>
    </div>
  );

  // ── SCANNING (premium AI scan sequence, driven by the real detection result) ─
  if (stage === "scanning") {
    if (!imageUrl || !analysis) return null;
    return (
      <div>
        <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", color: "#301607" }}>
          <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ AI ANALYSIS IN PROGRESS ✦</div>
          <div style={{
            width: "100%", maxWidth: 440, aspectRatio: `${imageDims.width} / ${imageDims.height}`,
            borderRadius: 20, overflow: "hidden", border: "2px solid rgba(89,34,9,0.4)", boxShadow: "0 0 40px rgba(89,34,9,0.25)",
          }}>
            <ScanSequence imageUrl={imageUrl} result={analysis} onComplete={() => setStage("results")} />
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (!result) return null;
  const lineColors: Record<string,string> = { heart:"#e87070", head:"#7090e8", life:"#70e890", fate:"#b070e8" };

  return (
    <div>
      <style>{`
        @keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        .tab-btn:hover{border-color:rgba(89,34,9,0.5)!important}
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px", color: "#301607" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48, animation: "fade-in 0.6s ease" }}>
          <div style={{ fontSize: 13, color: "#592209", letterSpacing: "0.3em", marginBottom: 12, fontWeight: 600 }}>✦ YOUR PALM READING CONSULTATION ✦</div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: "#301607", margin: "0 0 12px" }}>Your Cosmic Palm Report</h1>
          <p style={{ color: "#592209", fontSize: 16 }}>Prepared exclusively based on your palm analysis</p>
        </div>

        {/* Palm Overview */}
        <div style={sec}>
          <SectionTitle icon="🤚" title="Palm Overview"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            {/* Score card */}
            <div style={{ ...card, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#592209", letterSpacing: "0.2em", marginBottom: 16 }}>PALM STRENGTH SCORE</div>
              <div style={{ fontSize: 56, fontWeight: 900, background: "#592209", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>
                {result.score.toFixed(1)}<span style={{ fontSize: 24 }}>/10</span>
              </div>
              <div style={{ marginTop: 16 }}>
                <ScoreBar value={result.score * 10} color="#592209"/>
              </div>
            </div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Confidence Level", value: `${result.confidence}%`, color: "#301607" },
                { label: "Hand Type",        value: result.handType,         color: "#592209" },
                { label: "Element",          value: result.handElement,      color: "#592209" },
                { label: "Dominance",        value: result.dominance,        color: "#592209" },
              ].map(s=>(
                <div key={s.label} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#592209", letterSpacing: "0.15em", marginBottom: 8, textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Real detected palm lines — hover/tap any line for details */}
          {imageUrl && analysis && (
            <div style={{ maxWidth: 460, margin: "0 auto" }}>
              <div style={{ fontSize: 12, color: "rgba(48,22,7,0.72)", letterSpacing: "0.15em", marginBottom: 12, textAlign: "center" }}>YOUR DETECTED PALM LINES</div>
              <PalmLineOverlay imageUrl={imageUrl} analysis={analysis} />
            </div>
          )}
          <div style={{ ...card, marginTop: 24 }}>
            <div style={{ fontSize: 13, color: "#592209", letterSpacing: "0.15em", marginBottom: 12 }}>CONSULTATION SUMMARY</div>
            <p style={{ color: "#592209", fontSize: 17, lineHeight: 1.85, margin: 0, fontStyle: "italic" }}>"{result.summary}"</p>
          </div>
        </div>

        {/* AI Analysis Dashboard */}
        {analysis && (
          <div style={sec}>
            <SectionTitle icon="📊" title="AI Analysis Dashboard"/>
            <MetricDashboard metrics={buildDashboardMetrics(result, analysis)} />
          </div>
        )}

        {/* Major Lines Analysis */}
        <div style={sec}>
          <SectionTitle icon="✋" title="Major Lines Analysis"/>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {(["heart","head","life","fate"] as const).map(l=>(
              <button key={l} className="tab-btn" onClick={()=>setActiveLineTab(l)}
                style={{ padding: "10px 24px", borderRadius: 24, border: `2px solid ${activeLineTab===l?lineColors[l]:"rgba(89,34,9,0.2)"}`, background: activeLineTab===l?`${lineColors[l]}22`:"transparent", color: activeLineTab===l?lineColors[l]:"rgba(89,34,9,0.3)", fontWeight: 700, fontSize: 14, cursor: "pointer", textTransform: "capitalize", transition: "all 0.2s" }}>
                {l} Line
              </button>
            ))}
          </div>
          {/* Active line content */}
          {(() => {
            const l = result.lines[activeLineTab];
            const col = lineColors[activeLineTab];
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ ...card, marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                      {[["Length",l.length],["Depth",l.depth],["Clarity",l.clarity]].map(([k,v])=>(
                        <div key={k} style={{ background: `${col}15`, border: `1px solid ${col}40`, borderRadius: 10, padding: "8px 16px" }}>
                          <div style={{ fontSize: 10, color: `${col}aa`, letterSpacing: "0.15em" }}>{k}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: col }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ color: "#592209", fontSize: 16, lineHeight: 1.8, margin: 0 }}>{l.interpretation}</p>
                  </div>
                  <div style={{ ...card, background: `${col}08` }}>
                    <div style={{ color: col, fontWeight: 700, fontSize: 13, letterSpacing: "0.15em", marginBottom: 12 }}>RECOMMENDATION</div>
                    <p style={{ color: "#592209", fontSize: 15, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>{l.recommendations}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={card}>
                    <div style={{ color: "#301607", fontWeight: 700, fontSize: 13, letterSpacing: "0.15em", marginBottom: 14 }}>STRENGTHS</div>
                    {l.strengths.map(s=>(
                      <div key={s} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <span style={{ color: "#301607" }}>✦</span>
                        <span style={{ fontSize: 15, color: "rgba(48,22,7,0.8)" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ color: "#9B2C1D", fontWeight: 700, fontSize: 13, letterSpacing: "0.15em", marginBottom: 14 }}>GROWTH AREAS</div>
                    {l.challenges.map(c=>(
                      <div key={c} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <span style={{ color: "#9B2C1D" }}>◆</span>
                        <span style={{ fontSize: 15, color: "rgba(48,22,7,0.8)" }}>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Mounts */}
        <div style={sec}>
          <SectionTitle icon="⛰️" title="Planetary Mounts Analysis"/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {result.mounts.map(m=>(
              <div key={m.name} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ color: "#592209", fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                    <div style={{ color: "rgba(48,22,7,0.72)", fontSize: 12 }}>Planet: {m.planet}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: m.strength>75?"#4ade80":"#592209" }}>{m.strength}%</div>
                </div>
                <ScoreBar value={m.strength} color={m.strength>75?"#4ade80":"#592209"}/>
                <p style={{ color: "#592209", fontSize: 13, lineHeight: 1.6, margin: "12px 0 0" }}>{m.meaning}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Personality Blueprint */}
        <div style={sec}>
          <SectionTitle icon="🧠" title="Personality Blueprint"/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {result.personality.map(t=>(
              <div key={t.name} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <span style={{ color: "#301607", fontWeight: 700, fontSize: 15 }}>{t.name}</span>
                  </div>
                  <span style={{ color: "#592209", fontWeight: 800, fontSize: 16 }}>{t.score}%</span>
                </div>
                <ScoreBar value={t.score}/>
              </div>
            ))}
          </div>
        </div>

        {/* Love & Career */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          <div style={{ ...sec, marginBottom: 0 }}>
            <SectionTitle icon="❤️" title="Love & Relationships"/>
            {result.love.map(l=>(
              <div key={l} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <span style={{ color: "#592209", fontSize: 16, flexShrink: 0 }}>♥</span>
                <span style={{ fontSize: 16, color: "rgba(48,22,7,0.8)", lineHeight: 1.5 }}>{l}</span>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: "#592209", letterSpacing: "0.15em", marginBottom: 12 }}>RELATIONSHIP STRENGTHS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.loveStrengths.map(s=>(
                  <span key={s} style={{ background: "rgba(89,34,9,0.1)", border: "1px solid rgba(89,34,9,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 13, color: "#592209" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ ...sec, marginBottom: 0 }}>
            <SectionTitle icon="💼" title="Career & Wealth"/>
            {result.career.map(c=>(
              <div key={c} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <span style={{ color: "#592209", fontSize: 16, flexShrink: 0 }}>✦</span>
                <span style={{ fontSize: 16, color: "rgba(48,22,7,0.8)", lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: "#592209", letterSpacing: "0.15em", marginBottom: 12 }}>IDEAL CAREER PATHS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.careerTypes.map(c=>(
                  <span key={c} style={{ background: "rgba(89,34,9,0.1)", border: "1px solid rgba(89,34,9,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 13, color: "#592209" }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Life Timeline */}
        <div style={sec}>
          <SectionTitle icon="🌍" title="Life Journey Timeline"/>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 20, top: 0, bottom: 0, width: 2, background: "#F5E9D6)" }}/>
            {result.timeline.map((t,i)=>(
              <div key={i} style={{ display: "flex", gap: 28, marginBottom: 32, paddingLeft: 56, position: "relative" }}>
                <div style={{ position: "absolute", left: 10, top: 4, width: 22, height: 22, borderRadius: "50%", background: "#FBF5EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000" }}>{i+1}</div>
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ color: "#592209", fontWeight: 800, fontSize: 17 }}>{t.phase}</div>
                    <div style={{ color: "#592209", fontSize: 13, fontWeight: 600 }}>{t.years}</div>
                  </div>
                  <div style={{ color: "rgba(48,22,7,0.75)", fontSize: 12, letterSpacing: "0.15em", marginBottom: 10 }}>{t.theme}</div>
                  <p style={{ color: "#592209", fontSize: 15, lineHeight: 1.7, margin: 0 }}>{t.insight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Strengths */}
        <div style={sec}>
          <SectionTitle icon="💎" title="Hidden Strengths"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {result.hiddenStrengths.map((s,i)=>(
              <div key={i} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5E9D6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000", flexShrink: 0 }}>{i+1}</div>
                <span style={{ fontSize: 16, color: "rgba(48,22,7,0.85)", lineHeight: 1.6 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div style={sec}>
          <SectionTitle icon="🌟" title="Personalized Recommendations"/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {result.recommendations.map(r=>(
              <div key={r.category} style={card}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{r.icon}</div>
                <div style={{ color: "#592209", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{r.category}</div>
                <p style={{ color: "#592209", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{r.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ ...sec, textAlign: "center", background: "linear-gradient(135deg,rgba(89,34,9,0.08),rgba(89,34,9,0))" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✨</div>
          <h3 style={{ color: "#592209", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Want a Deeper Reading?</h3>
          <p style={{ color: "#592209", fontSize: 16, marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>Combine your palm reading with your birth chart and zodiac profile for a complete cosmic consultation.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={goldBtn} onClick={()=>setStage("landing")}>🔄 New Palm Reading</button>
            <button style={{ ...goldBtn, background: "rgba(89,34,9,0.12)", color: "#592209", boxShadow: "none", border: "1px solid rgba(89,34,9,0.35)" }}>🌌 View Birth Chart</button>
          </div>
        </div>

      </div>
    </div>
  );
}