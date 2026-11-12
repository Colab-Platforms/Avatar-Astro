import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { useBackOverride } from "../context/NavigationContext";
import {
  defaultPalmAnalysisEngine, loadImageFromDataUrl,
  type HandLandmarks, type HandType, type PalmAnalysisResult,
} from "@/lib/palmAnalysis";
import { SQUARE_PALM_MIN, LONG_FINGERS_MIN } from "@/lib/palmAnalysis/lineEstimator";
import { ScanSequence } from "@/components/palm/ScanSequence";
import PalmEducation from "@/components/palm/PalmEducation";
import { authedFetch, requireSignIn, SignInRequiredError } from "@/lib/authedFetch";
import { AUTH_API_BASE_URL } from "@/lib/authClient";

// Upload limits (checked before anything is read or analysed).
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;


// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "landing" | "processing" | "retake" | "scanning" | "results" | "live";

// ─── Hand type reference (shown on landing + live scan so users know what
// the scanner is classifying against) ─────────────────────────────────────
const HAND_TYPE_LEGEND: { type: HandType; emoji: string; label: string; traits: string; shape: string }[] = [
  { type: "Earth", emoji: "🌍", label: "Earth Hand", traits: "Practical, stable, grounded, reliable", shape: "Square palm, short fingers" },
  { type: "Air",   emoji: "💨", label: "Air Hand",   traits: "Intelligent, curious, communicative", shape: "Square palm, long fingers" },
  { type: "Water", emoji: "🌊", label: "Water Hand", traits: "Emotional, intuitive, artistic", shape: "Long palm, long fingers" },
  { type: "Fire",  emoji: "🔥", label: "Fire Hand",  traits: "Energetic, ambitious, spontaneous", shape: "Rectangular palm, short fingers" },
];

// Traditional descriptions per hand shape (fixed text; chosen by the measured shape only).
const HAND_MEANINGS: Record<HandType, string> = {
  Earth: "In classical palmistry the Earth hand has a square palm and short fingers. It is traditionally associated with a practical, steady and dependable temperament, and a preference for tangible work and routine.",
  Air: "In classical palmistry the Air hand has a square palm and long fingers. It is traditionally associated with a curious, communicative and analytical temperament, and a love of ideas and conversation.",
  Water: "In classical palmistry the Water hand has a long palm and long fingers. It is traditionally associated with a sensitive, intuitive and imaginative temperament, and a rich emotional life.",
  Fire: "In classical palmistry the Fire hand has a long palm and short fingers. It is traditionally associated with an energetic, spontaneous and enthusiastic temperament, and a bold approach to new ventures.",
};

// Traditional notes per hand shape, grouped the way the result page shows them. They describe the SHAPE our measurement found,
// not lines or marks on the palm, and are fixed text chosen only by that measured shape (no AI, no scoring).
const HAND_SECTIONS: Record<HandType, { personality: string; strengths: string[]; tendencies: string; career: string; relationships: string }> = {
  Earth: {
    personality: "Practical, steady and down to earth. You are traditionally seen as someone people can depend on.",
    strengths: ["Reliability", "Patience", "A good sense for practical matters"],
    tendencies: "You may prefer routine and tangible results, and take time to accept change. At times this can look like stubbornness.",
    career: "Traditionally suited to hands-on or structured work, such as building, craft, farming, finance or administration.",
    relationships: "Loyal and steady. You are likely to show care through actions rather than words, and may be slow to share feelings.",
  },
  Air: {
    personality: "Curious, talkative and analytical. You are traditionally seen as quick to understand and to share ideas.",
    strengths: ["Communication", "Learning quickly", "Adaptability"],
    tendencies: "You may spend a lot of time in your thoughts, and can overthink or spread your attention across too many things.",
    career: "Traditionally suited to teaching, writing, media, technology, law or sales, where ideas and words are central.",
    relationships: "You value conversation and shared interests. It can help to express feelings as well as discuss ideas.",
  },
  Water: {
    personality: "Sensitive, imaginative and caring. You are traditionally seen as someone who feels things deeply.",
    strengths: ["Intuition", "Creativity", "Compassion"],
    tendencies: "Your moods may change with your surroundings, and you can absorb other people's feelings. Quiet time to recharge may help.",
    career: "Traditionally suited to the arts, design, music, healing, counselling and other caring work.",
    relationships: "Emotionally rich and wanting closeness. Clear personal boundaries can protect your energy.",
  },
  Fire: {
    personality: "Energetic, bold and enthusiastic. You are traditionally seen as someone who gets things moving.",
    strengths: ["Initiative", "Courage", "Motivation"],
    tendencies: "You may start quickly and lose patience with slow work. Pausing before big decisions can be useful.",
    career: "Traditionally suited to leadership, business ventures, sport, sales or performance, where energy and drive count.",
    relationships: "Warm, passionate and generous. Listening without rushing can deepen your closest bonds.",
  },
};

const PALM_TERMS: [string, string][] = [
  ["Hasta Samudrika Shastra", "The Indian tradition of reading the hand. It looks mainly at the lines and mounts of the palm."],
  ["Jeevan, Mastishk, Hriday and Bhagya Rekha", "The life line, head line, heart line and fate line. This Seva does not read them."],
  ["Hand shape (Earth, Air, Water, Fire)", "A classical way to group hands by the proportions of the palm and fingers. It comes from the European tradition of palmistry (chiromancy)."],
  ["Palm width ÷ length", "How wide your palm is compared with how long it is. A value of about 0.9 or more is called a square palm here."],
  ["Finger ÷ palm length", "How long your fingers are compared with your palm. A higher value means longer fingers."],
  ["Hand landmarks", "21 points (knuckles and fingertips) that the app finds in your photo so it can measure the hand."],
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

// ─── Sub-components ───────────────────────────────────────────────────────────
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
  useFeatureTitle(FEATURES.palm);
  const { t } = useTranslation();
  const featureName = t("features.palm-reading.name", { defaultValue: FEATURES.palm.name });
  const hl = (type: HandType, field: string, def: string) => t(`palm.hand.${type}.${field}`, { defaultValue: def });
  const [stage, setStage]           = useState<Stage>("landing");
  const [imageUrl, setImageUrl]     = useState<string | null>(null); // preprocessed (cropped/aligned/enhanced) palm photo
  const [imageDims, setImageDims]   = useState({ width: 3, height: 4 });
  const [analysis, setAnalysis]     = useState<PalmAnalysisResult | null>(null);
  const [processingMessage, setProcessingMessage] = useState(() => i18n.t("palm.processing.preparing"));
  const [processingPct, setProcessingPct]         = useState(0);
  const [retakeMessage, setRetakeMessage]         = useState<string | null>(null);
  const [liveMessage, setLiveMessage]             = useState(() => i18n.t("palm.live.align"));
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
  const runIdRef = useRef(0);

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
    setAnalysis(null);
    setImageUrl(null);
    setRetakeMessage(null);
    setProcessingPct(0);
  }, []);
  useBackOverride(stage !== "landing" ? resetToLanding : null, [stage]);

  const runAnalysisPipeline = useCallback(async (dataUrl: string) => {
    setRetakeMessage(null);
    try {
      const checkRes = await authedFetch(`${AUTH_API_BASE_URL}/palm-reading/check`, { method: "POST" });
      if (!checkRes.ok) {
        const body = await checkRes.json().catch(() => null);
        setRetakeMessage(body?.message || i18n.t("palm.errors.unavailable"));
        setStage("retake");
        return;
      }
    } catch (err) {
      if (!(err instanceof SignInRequiredError)) {
        setRetakeMessage(i18n.t("palm.errors.usageLimit"));
        setStage("retake");
      }
      return;
    }

    setStage("processing");
    setProcessingPct(0);
    setProcessingMessage(i18n.t("palm.processing.preparing"));
    // Never leave the user waiting: if detection stalls, give up after 60s and offer a retake.
    const run = ++runIdRef.current;
    const watchdog = window.setTimeout(() => {
      if (runIdRef.current !== run) return;
      runIdRef.current++;
      setRetakeMessage(i18n.t("palm.errors.tooLong"));
      setStage("retake");
    }, 60000);
    try {
      let sourceImg: HTMLImageElement;
      try {
        sourceImg = await loadImageFromDataUrl(dataUrl);
      } catch {
        window.clearTimeout(watchdog);
        setRetakeMessage(i18n.t("palm.errors.openImage"));
        setStage("retake");
        return;
      }

      await defaultPalmAnalysisEngine.ensureReady((pct) => setProcessingPct(pct * 0.45));
      setProcessingMessage(i18n.t("palm.processing.detecting"));
      const quality = await defaultPalmAnalysisEngine.checkQuality(sourceImg);
      setProcessingPct(60);

      if (!quality.ok || !quality.landmarks) {
        window.clearTimeout(watchdog);
        setRetakeMessage(quality.message ?? i18n.t("palm.errors.noClearReading"));
        setStage("retake");
        return;
      }

      setProcessingMessage(i18n.t("palm.processing.cropping"));
      const processed = await defaultPalmAnalysisEngine.preprocess(sourceImg, quality.landmarks);
      setProcessingPct(82);
      const processedImg = await loadImageFromDataUrl(processed.dataUrl);

      setProcessingMessage(i18n.t("palm.processing.measuring"));
      const fullAnalysis = await defaultPalmAnalysisEngine.analyze(processedImg, quality.landmarks);
      setProcessingPct(100);

      window.clearTimeout(watchdog);
      if (runIdRef.current !== run) return; // timed out or cancelled meanwhile
      setImageUrl(processed.dataUrl);
      setImageDims({ width: processed.width, height: processed.height });
      setAnalysis(fullAnalysis);
      setStage("scanning");
    } catch (err) {
      window.clearTimeout(watchdog);
      if (runIdRef.current !== run) return;
      console.error("[PalmReading] analysis pipeline failed", err);
      setRetakeMessage(i18n.t("palm.errors.modelLoad"));
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
          setLiveMessage(quality.message ?? i18n.t("palm.live.notDetected"));
          captureTimeoutRef.current = window.setTimeout(captureFrame, 900);
          return;
        }

        setLiveLocked(true);
        setLiveMessage(i18n.t("palm.live.capturing"));
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setStage("processing");
        runAnalysisPipeline(dataUrl);
      } catch (err) {
        console.error("[PalmReading] live capture failed", err);
        if (!isActive) return;
        setLiveLocked(false);
        setLiveMessage(i18n.t("palm.live.stillScanning"));
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
        setCameraError(i18n.t("palm.errors.cameraUnsupported"));
        return;
      }

      setCameraError(null);
      setLiveMessage(i18n.t("palm.live.preparing"));
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
        setLiveMessage(i18n.t("palm.live.holdPalm"));
        await defaultPalmAnalysisEngine.ensureReady((pct) => setProcessingPct(Math.round(pct * 0.6)));
        captureFrame();
      } catch (err) {
        console.error("[PalmReading] live camera failed", err);
        if (!isActive) return;
        const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        setCameraError(
          denied
            ? i18n.t("palm.errors.cameraDenied")
            : i18n.t("palm.errors.cameraFailed")
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
    e.target.value = ""; // allow re-selecting the same file after a retake
    if (!file) return;
    // Signed out: ask first. The chosen photo stays in memory and is analysed once after sign-in.
    if (!requireSignIn(() => handleFile({ target: { files: [file], value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>))) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setRetakeMessage(i18n.t("palm.errors.fileType"));
      setStage("retake");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setRetakeMessage(i18n.t("palm.errors.fileTooLarge"));
      setStage("retake");
      return;
    }
    if (file.size === 0) {
      setRetakeMessage(i18n.t("palm.errors.fileEmpty"));
      setStage("retake");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => runAnalysisPipeline(ev.target?.result as string);
    reader.onerror = () => {
      setRetakeMessage(i18n.t("palm.errors.fileRead"));
      setStage("retake");
    };
    reader.readAsDataURL(file);
  };

  const sec: React.CSSProperties = { background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.18)", borderRadius: 24, padding: "36px 40px", marginBottom: 28 };
  const card: React.CSSProperties = { background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.14)", borderRadius: 16, padding: "24px" };
  const goldBtn: React.CSSProperties = { background: "#F5E9D6", color: "#000", fontWeight: 800, fontSize: 16, letterSpacing: "0.1em", padding: "16px 36px", borderRadius: 32, border: "none", cursor: "pointer", boxShadow: "0 0 24px rgba(89,34,9,0.4)" };

  // Shared across landing + retake so both can trigger the same upload dialog.
  const fileInput = <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("palm.upload.ariaLabel")} onChange={handleFile} style={{ display: "none" }} />;

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
          <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 16, fontWeight: 600 }}>✦ {t("palm.hero.eyebrow")} ✦</div>
          <h1 style={{ fontSize: 58, fontWeight: 900, color: "#301607", letterSpacing: "0.06em", margin: "0 0 20px", lineHeight: 1.1 }}>
            {featureName}<br/>
            <span style={{ background: "#592209", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>{t("palm.hero.titleAccent")}</span>
          </h1>
          <p style={{ fontSize: 20, color: "rgba(48,22,7,0.72)", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.8 }}>
            {t("palm.hero.intro")}
          </p>
          {/* Premium palm hero image */}
          <div className="pr-hero-img-wrap" style={{ marginBottom: 48, marginTop: 8, borderRadius: 28 }}>
            <img
              src="/images/palm-reading/premium-palm.jpeg"
              alt={t("palm.hero.imageAlt")}
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
            <h3 style={{ color: "#592209", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{t("palm.upload.title")}</h3>
            <p style={{ color: "#592209", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>{t("palm.upload.desc")}</p>
            <button style={goldBtn}>📤 {t("palm.upload.button")}</button>
          </div>
          {/* Live scan */}
          <div className="pr-card" style={{ ...sec, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📷</div>
            <h3 style={{ color: "#592209", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{t("palm.live.cardTitle")}</h3>
            <p style={{ color: "#592209", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>{t("palm.live.cardDesc")}</p>
            <button style={goldBtn} onClick={() => setStage("live")}>📱 {t("palm.live.start")}</button>
          </div>
        </div>

        {/* Guidelines */}
        <div style={sec}>
          <SectionTitle icon="📋" title={t("palm.guidelines.title")}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={card}>
              <div style={{ color: "#301607", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>✅ {t("palm.guidelines.ideal")}</div>
              {["Full palm clearly visible","Bright, even natural lighting","Fingers slightly spread apart","Palm centered in frame","Sharp, high-resolution image"].map((g, gi)=>(
                <div key={g} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#301607", fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 15, color: "rgba(48,22,7,0.8)" }}>{t(`palm.guidelines.idealItems.${gi}`, { defaultValue: g })}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ color: "#9B2C1D", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>❌ {t("palm.guidelines.avoid")}</div>
              {["Blurry or out-of-focus image","Dark or shadowed lighting","Fingers closed or curled","Palm partially cropped","Low resolution photos"].map((b, bi)=>(
                <div key={b} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#9B2C1D", fontSize: 16 }}>✗</span>
                  <span style={{ fontSize: 15, color: "rgba(48,22,7,0.8)" }}>{t(`palm.guidelines.avoidItems.${bi}`, { defaultValue: b })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hand type legend */}
        <div style={sec}>
          <SectionTitle icon="🤲" title={t("palm.legend.title")}/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {HAND_TYPE_LEGEND.map(h=>(
              <div key={h.type} style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{h.emoji}</div>
                <div style={{ color: "#592209", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{hl(h.type, "label", h.label)}</div>
                <div style={{ color: "rgba(48,22,7,0.72)", fontSize: 11, marginBottom: 8 }}>{hl(h.type, "shape", h.shape)}</div>
                <div style={{ color: "#592209", fontSize: 13, lineHeight: 1.5 }}>{hl(h.type, "traits", h.traits)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line legend */}
        <div style={sec}>
          <SectionTitle icon="🖐️" title={t("palm.scope.title")}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="pr-scope">
            <div style={card}>
              <div style={{ color: "#2F6B3A", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>✅ {t("palm.scope.measured")}</div>
              {["Hand shape: palm width and length", "Finger length compared with the palm", "Thumb angle", "Whether the photo shows a left or right hand"].map((item, ii) => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#2F6B3A", fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 15, color: "#4A2E1F" }}>{t(`palm.scope.measuredItems.${ii}`, { defaultValue: item })}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ color: "#9B2C1D", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>❌ {t("palm.scope.notRead")}</div>
              {["The lines on your palm (heart, head, life, fate)", "Mounts, marks or skin features", "Any prediction of your future, health or relationships"].map((item, ii) => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#9B2C1D", fontSize: 16 }}>✗</span>
                  <span style={{ fontSize: 15, color: "#4A2E1F" }}>{t(`palm.scope.notReadItems.${ii}`, { defaultValue: item })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
      <PalmEducation />
    </div>
  );

  // ── PROCESSING (real detection + preprocessing running) ───────────────────
  if (stage === "processing") return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", color: "#301607" }}>
        <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ {t("palm.processing.eyebrow")} ✦</div>
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
        <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ {t("palm.live.eyebrow")} ✦</div>
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
                  {liveLocked ? t("palm.live.locked") : t("palm.live.scanning")}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{liveMessage}</div>
              {liveLandmarks && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{ background: "#FBF5EC", border: "1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#6B4A37" }}>
                    ✋ {t("palm.live.handChip", { hand: t(`palm.handedness.${liveLandmarks.handedness}`, { defaultValue: liveLandmarks.handedness }) })}
                  </span>
                  <span style={{ background: "#FBF5EC", border: "1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#6B4A37" }}>
                    {t("palm.live.landmarks")}
                  </span>
                </div>
              )}
            </div>
            <button
              style={{ ...goldBtn, background: "rgba(89,34,9,0.08)", color: "#301607", boxShadow: "none" }}
              onClick={() => { cleanupCamera(); resetToLanding(); }}
            >
              ✕ {t("palm.live.cancel")}
            </button>
          </div>
        </div>
        {cameraError ? (
          <div style={{ maxWidth: 640, marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ color: "#6B4A37", fontSize: 15 }}>{cameraError}</div>
            <button style={goldBtn} onClick={() => { setCameraError(null); setCameraRetryTick(n => n + 1); }}>🔄 {t("palm.live.tryAgain")}</button>
          </div>
        ) : (
          <div style={{ maxWidth: 640, marginTop: 24, color: "rgba(48,22,7,0.75)", fontSize: 15, lineHeight: 1.7 }}>
            {t("palm.live.hint")}
          </div>
        )}
        {/* Hand type reference while the user waits for a stable lock */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 28, maxWidth: 880 }}>
          {HAND_TYPE_LEGEND.map(h => (
            <div key={h.type} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.16)", borderRadius: 20, padding: "6px 14px" }}>
              <span style={{ fontSize: 16 }}>{h.emoji}</span>
              <span style={{ fontSize: 12, color: "rgba(48,22,7,0.72)" }}>{hl(h.type, "label", h.label)}</span>
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
        <h2 style={{ color: "#301607", fontSize: 26, fontWeight: 800, marginBottom: 14 }}>{t("palm.retake.title")}</h2>
        <p style={{ color: "#592209", fontSize: 16, maxWidth: 440, marginBottom: 32, lineHeight: 1.7 }}>
          {retakeMessage ?? t("palm.errors.noClearReading")}
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button style={goldBtn} onClick={() => fileRef.current?.click()}>📤 {t("palm.retake.uploadAnother")}</button>
          <button style={{ ...goldBtn, background: "rgba(89,34,9,0.12)", color: "#592209", boxShadow: "none", border: "1px solid rgba(89,34,9,0.35)" }} onClick={resetToLanding}>← {t("palm.retake.back")}</button>
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
          <div style={{ fontSize: 14, color: "#592209", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ {t("palm.scanning.eyebrow")} ✦</div>
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
  if (!analysis || !imageUrl) return null;
  const g = analysis.geometry;
  const fr = g.fingerLengthRatios;
  const avgFinger = (fr.index + fr.middle + fr.ring + fr.pinky) / 4;
  const squarePalm = g.palmWidthToLengthRatio >= SQUARE_PALM_MIN;
  const longFingers = avgFinger >= LONG_FINGERS_MIN;
  const shape = HAND_TYPE_LEGEND.find((h) => h.type === g.handType) ?? HAND_TYPE_LEGEND[0];
  const meaning = HAND_MEANINGS[g.handType];
  const hand = analysis.landmarks.handedness;
  const shapeLabel = hl(shape.type, "label", shape.label);
  const palmAdj = squarePalm ? t("palm.results.adj.square") : t("palm.results.adj.long");
  const fingerAdj = longFingers ? t("palm.results.adj.longFingers") : t("palm.results.adj.shortFingers");

  return (
    <div>
      <style>{`
        @keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .pr-res-grid{display:grid;grid-template-columns:minmax(0,420px) 1fr;gap:28px;align-items:start}
        .pr-measure{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        @media (max-width:860px){.pr-res-grid{grid-template-columns:1fr}.pr-measure{grid-template-columns:1fr 1fr}}
      `}</style>
      <div data-testid="palm-results" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 40px", color: "#301607" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40, animation: "fade-in 0.6s ease" }}>
          <div style={{ fontSize: 13, color: "rgba(188,106,77,0.75)", letterSpacing: "0.3em", marginBottom: 12, fontWeight: 600 }}>✦ {t("palm.results.eyebrow", { feature: featureName.toUpperCase() })} ✦</div>
          <h1 style={{ fontSize: "clamp(30px,5vw,44px)", fontWeight: 900, color: "#301607", margin: "0 0 12px" }}>{hl(shape.type, "label", shape.label)}</h1>
          <p style={{ color: "#4A2E1F", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
            {t("palm.results.basedOn", { shape: hl(shape.type, "shape", shape.shape) })}
          </p>
        </div>

        <div className="pr-res-grid">
          {/* Photo with the real detected landmarks */}
          <div>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: "2px solid rgba(188,106,77,0.4)", aspectRatio: `${imageDims.width} / ${imageDims.height}` }}>
              <img src={imageUrl} alt={t("palm.results.photoAlt")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                {analysis.landmarkPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={0.007} fill="#fff6df" style={{ filter: "drop-shadow(0 0 3px #ffd98a)" }} />
                ))}
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "#6B4A37", textAlign: "center", margin: "10px 0 0", lineHeight: 1.6 }}>
              {t("palm.results.dotsNote")}
            </p>
          </div>

          <div>
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "rgba(188,106,77,0.8)", letterSpacing: "0.15em", marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>{t("palm.results.meaningTitle", { label: shapeLabel })}</div>
              <p style={{ margin: "0 0 12px", fontSize: 17, lineHeight: 1.75, color: "#301607" }}>{hl(g.handType, "meaning", meaning)}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#6B4A37" }}>{t("palm.results.traitsLine", { traits: hl(shape.type, "traits", shape.traits).toLowerCase() })}</p>
            </div>

            <div style={card}>
              <div style={{ fontSize: 13, color: "rgba(188,106,77,0.8)", letterSpacing: "0.15em", marginBottom: 14, textTransform: "uppercase", fontWeight: 700 }}>{t("palm.results.classifiedTitle")}</div>
              <div className="pr-measure" data-testid="palm-measures">
                <div>
                  <div style={{ fontSize: 12, color: "#6B4A37", marginBottom: 4 }}>{t("palm.results.palmRatio")}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#301607" }}>{g.palmWidthToLengthRatio.toFixed(2)}</div>
                  <div style={{ fontSize: 13, color: "#BC6A4D" }}>{t("palm.results.palmRatioNote", { kind: squarePalm ? t("palm.results.squarePalm") : t("palm.results.longPalm"), min: SQUARE_PALM_MIN })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6B4A37", marginBottom: 4 }}>{t("palm.results.fingerRatio")}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#301607" }}>{avgFinger.toFixed(2)}</div>
                  <div style={{ fontSize: 13, color: "#BC6A4D" }}>{t("palm.results.fingerRatioNote", { kind: longFingers ? t("palm.results.longFingers") : t("palm.results.shortFingers"), min: LONG_FINGERS_MIN })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6B4A37", marginBottom: 4 }}>{t("palm.results.handInPhoto")}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#301607" }}>{t("palm.results.handValue", { hand: t(`palm.handedness.${hand}`, { defaultValue: hand }) })}</div>
                  <div style={{ fontSize: 13, color: "#6B4A37" }}>{t("palm.results.dominantNote")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6B4A37", marginBottom: 4 }}>{t("palm.results.thumbAngle")}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#301607" }}>{Math.round(g.thumbAngleDeg)}°</div>
                  <div style={{ fontSize: 13, color: "#592209" }}>{t("palm.results.thumbNote")}</div>
                </div>
              </div>
              <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.65, color: "#4A2E1F" }}>
                {t("palm.results.classNote", { palm: palmAdj, fingers: fingerAdj, shape: shapeLabel })}
              </p>
            </div>
          </div>
        </div>

        {(() => {
          const sec = HAND_SECTIONS[g.handType];
          const box: React.CSSProperties = { ...card, padding: 22 };
          const lab: React.CSSProperties = { fontSize: 13, color: "#592209", letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase", fontWeight: 700 };
          const body: React.CSSProperties = { margin: 0, fontSize: 17, lineHeight: 1.7, color: "#301607" };
          return (
            <section data-testid="palm-sections" aria-label={t("palm.sections.ariaLabel")} style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: "clamp(22px,3.5vw,28px)", fontWeight: 800, color: "#301607", margin: "0 0 6px", textAlign: "center" }}>{t("palm.sections.title", { label: shapeLabel })}</h2>
              <p style={{ textAlign: "center", color: "#4A2E1F", fontSize: 15, margin: "0 auto 18px", maxWidth: 640 }}>
                {t("palm.sections.intro", { palm: palmAdj, fingers: fingerAdj })}
              </p>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
                <div style={box}><div style={lab}>{t("palm.sections.personality")}</div><p style={body}>{hl(g.handType, "personality", sec.personality)}</p></div>
                <div style={box}><div style={lab}>{t("palm.sections.strengths")}</div><ul style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 0, margin: 0, listStyle: "none" }}>{sec.strengths.map((x, xi) => <li key={x} style={{ padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(89,34,9,0.3)", background: "rgba(89,34,9,0.06)", color: "#592209", fontSize: 15 }}>{hl(g.handType, `strengths.${xi}`, x)}</li>)}</ul></div>
                <div style={box}><div style={lab}>{t("palm.sections.tendencies")}</div><p style={body}>{hl(g.handType, "tendencies", sec.tendencies)}</p></div>
                <div style={box}><div style={lab}>{t("palm.sections.career")}</div><p style={body}>{hl(g.handType, "career", sec.career)}</p></div>
                <div style={box}><div style={lab}>{t("palm.sections.relationships")}</div><p style={body}>{hl(g.handType, "relationships", sec.relationships)}</p></div>
              </div>
              <div style={{ ...card, marginTop: 16 }}>
                <div style={lab}>{t("palm.sections.termsTitle")}</div>
                <dl style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", margin: 0 }}>
                  {PALM_TERMS.map(([term, d], ti) => <div key={term}><dt style={{ fontWeight: 700, color: "#301607" }}>{t(`palm.terms.${ti}.term`, { defaultValue: term })}</dt><dd style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#4A2E1F" }}>{t(`palm.terms.${ti}.desc`, { defaultValue: d })}</dd></div>)}
                </dl>
              </div>
            </section>
          );
        })()}

        <div style={{ ...card, marginTop: 28, borderColor: "rgba(188,106,77,0.4)" }}>
          <div style={{ fontSize: 13, color: "rgba(188,106,77,0.9)", letterSpacing: "0.15em", marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>{t("palm.results.notCoveredTitle")}</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "#4A2E1F" }}>
            {t("palm.results.notCoveredBody")}
          </p>
        </div>

        <p style={{ margin: "28px auto 24px", maxWidth: 640, textAlign: "center", fontSize: 14, fontStyle: "italic", lineHeight: 1.7, color: "#592209" }}>
          {t("palm.results.disclaimer")}
        </p>
        <div style={{ textAlign: "center" }}>
          <button style={goldBtn} onClick={resetToLanding}>🔄 {t("palm.results.newReading")}</button>
        </div>
      </div>
      <AskDivyaSection feature="palm" context={`Hand shape: ${shape.label}. ${meaning}`} />
      <PalmEducation />
    </div>
  );
}
