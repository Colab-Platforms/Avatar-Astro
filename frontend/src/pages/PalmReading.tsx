import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useBackOverride } from "../context/NavigationContext";
import {
  defaultPalmAnalysisEngine, loadImageFromDataUrl,
  type HandLandmarks, type HandType, type PalmAnalysisResult,
} from "@/lib/palmAnalysis";
import { SQUARE_PALM_MIN, LONG_FINGERS_MIN } from "@/lib/palmAnalysis/lineEstimator";
import { ScanSequence } from "@/components/palm/ScanSequence";
import PalmEducation from "@/components/palm/PalmEducation";

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
      <h2 style={{ color: "#BC6A4D", fontSize: 15, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>{title}</h2>
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
        backgroundImage: "linear-gradient(rgba(127,196,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(127,196,255,0.12) 1px, transparent 1px)",
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
  const [processingMessage, setProcessingMessage] = useState("Preparing hand detection...");
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
    setStage("processing");
    setRetakeMessage(null);
    setProcessingPct(0);
    setProcessingMessage("Preparing hand detection...");
    // Never leave the user waiting: if detection stalls, give up after 60s and offer a retake.
    const run = ++runIdRef.current;
    const watchdog = window.setTimeout(() => {
      if (runIdRef.current !== run) return;
      runIdRef.current++;
      setRetakeMessage("The scan is taking too long. Please try again, or try a different photo.");
      setStage("retake");
    }, 60000);
    try {
      let sourceImg: HTMLImageElement;
      try {
        sourceImg = await loadImageFromDataUrl(dataUrl);
      } catch {
        window.clearTimeout(watchdog);
        setRetakeMessage("We couldn't open that file as an image. Please use a JPG, PNG or WebP photo.");
        setStage("retake");
        return;
      }

      await defaultPalmAnalysisEngine.ensureReady((pct) => setProcessingPct(pct * 0.45));
      setProcessingMessage("Detecting your palm...");
      const quality = await defaultPalmAnalysisEngine.checkQuality(sourceImg);
      setProcessingPct(60);

      if (!quality.ok || !quality.landmarks) {
        window.clearTimeout(watchdog);
        setRetakeMessage(quality.message ?? "We couldn't get a clear reading from this photo.");
        setStage("retake");
        return;
      }

      setProcessingMessage("Cropping, aligning and enhancing image...");
      const processed = await defaultPalmAnalysisEngine.preprocess(sourceImg, quality.landmarks);
      setProcessingPct(82);
      const processedImg = await loadImageFromDataUrl(processed.dataUrl);

      setProcessingMessage("Measuring hand proportions...");
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
      setRetakeMessage("The hand-detection model couldn't load. Check your connection and try again.");
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
    e.target.value = ""; // allow re-selecting the same file after a retake
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setRetakeMessage("That file type isn't supported. Please upload a JPG, PNG or WebP photo of your palm.");
      setStage("retake");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setRetakeMessage("That photo is larger than 10 MB. Please choose a smaller photo.");
      setStage("retake");
      return;
    }
    if (file.size === 0) {
      setRetakeMessage("That file is empty. Please choose another photo.");
      setStage("retake");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => runAnalysisPipeline(ev.target?.result as string);
    reader.onerror = () => {
      setRetakeMessage("We couldn't read that file. Please try another photo.");
      setStage("retake");
    };
    reader.readAsDataURL(file);
  };

  const sec: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(188,106,77,0.18)", borderRadius: 24, padding: "36px 40px", marginBottom: 28 };
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(188,106,77,0.14)", borderRadius: 16, padding: "24px" };
  const goldBtn: React.CSSProperties = { background: "linear-gradient(135deg,#BC6A4D,#BC6A4D,#BC6A4D)", color: "#000", fontWeight: 800, fontSize: 16, letterSpacing: "0.1em", padding: "16px 36px", borderRadius: 32, border: "none", cursor: "pointer", boxShadow: "0 0 24px rgba(188,106,77,0.4)" };

  // Shared across landing + retake so both can trigger the same upload dialog.
  const fileInput = <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a photo of your palm" onChange={handleFile} style={{ display: "none" }} />;

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (stage === "landing") return (
    <div>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(188,106,77,0.3)}50%{box-shadow:0 0 50px rgba(188,106,77,0.7)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fade-in-hero-img{from{opacity:0;transform:translateY(16px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .pr-card:hover{transform:translateY(-6px);border-color:rgba(188,106,77,0.5)!important;transition:all 0.3s ease}
        .pr-card{transition:all 0.3s ease}
        .pr-hero-img-wrap{display:inline-block;width:480px;max-width:92vw;animation:float 5s ease-in-out infinite,pulse-glow 4s ease-in-out infinite,fade-in-hero-img 0.9s ease 0.15s both}
        @media (max-width:1024px){.pr-hero-img-wrap{width:380px}}
        @media (max-width:640px){.pr-hero-img-wrap{width:280px}}
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px", color: "#e8e0f0" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 72, animation: "fade-in 0.7s ease" }}>
          <div style={{ fontSize: 14, color: "rgba(188,106,77,0.6)", letterSpacing: "0.3em", marginBottom: 16, fontWeight: 600 }}>✦ HAND SHAPE ANALYSIS ✦</div>
          <h1 style={{ fontSize: 58, fontWeight: 900, color: "#fff", letterSpacing: "0.06em", margin: "0 0 20px", lineHeight: 1.1 }}>
            Palm Reading<br/>
            <span style={{ background: "linear-gradient(135deg,#BC6A4D,#BC6A4D,#BC6A4D)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>Hand Shape</span>
          </h1>
          <p style={{ fontSize: 20, color: "rgba(232,224,240,0.65)", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.8 }}>
            Upload a photo of your palm or use your camera. The tool detects your hand, measures its proportions and describes your hand shape (Earth, Air, Water or Fire) using classical palmistry rules. Your photo is processed on your device and is not uploaded.
          </p>
          {/* Premium palm hero image */}
          <div className="pr-hero-img-wrap" style={{ marginBottom: 48, marginTop: 8, borderRadius: 28 }}>
            <img
              src="/images/palm-reading/premium-palm.jpeg"
              alt="Illustration of a glowing palm"
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
            <h3 style={{ color: "#BC6A4D", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Upload Palm Photo</h3>
            <p style={{ color: "rgba(232,224,240,0.6)", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>Choose a photo of your palm from your device. JPG, PNG or WebP, up to 10 MB.</p>
            <button style={goldBtn}>📤 Upload Photo</button>
          </div>
          {/* Live scan */}
          <div className="pr-card" style={{ ...sec, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📷</div>
            <h3 style={{ color: "#BC6A4D", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Live Palm Scan</h3>
            <p style={{ color: "rgba(232,224,240,0.6)", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>Use your camera. The scanner tracks your hand live and captures automatically once it has a clear view.</p>
            <button style={goldBtn} onClick={() => setStage("live")}>📱 Start Live Scan</button>
          </div>
        </div>

        {/* Guidelines */}
        <div style={sec}>
          <SectionTitle icon="📋" title="Photo & Scan Guidelines for Best Results"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={card}>
              <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>✅ IDEAL</div>
              {["Full palm clearly visible","Bright, even natural lighting","Fingers slightly spread apart","Palm centered in frame","Sharp, high-resolution image"].map(g=>(
                <div key={g} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 15, color: "rgba(232,224,240,0.8)" }}>{g}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>❌ AVOID</div>
              {["Blurry or out-of-focus image","Dark or shadowed lighting","Fingers closed or curled","Palm partially cropped","Low resolution photos"].map(b=>(
                <div key={b} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#f87171", fontSize: 16 }}>✗</span>
                  <span style={{ fontSize: 15, color: "rgba(232,224,240,0.8)" }}>{b}</span>
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
                <div style={{ color: "#BC6A4D", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{h.label}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 8 }}>{h.shape}</div>
                <div style={{ color: "rgba(232,224,240,0.6)", fontSize: 13, lineHeight: 1.5 }}>{h.traits}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line legend */}
        <div style={sec}>
          <SectionTitle icon="🖐️" title="What This Tool Does"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="pr-scope">
            <div style={card}>
              <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>✅ MEASURED FROM YOUR PHOTO</div>
              {["Hand shape: palm width and length", "Finger length compared with the palm", "Thumb angle", "Whether the photo shows a left or right hand"].map(t => (
                <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 15, color: "rgba(232,224,240,0.8)" }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", marginBottom: 16 }}>❌ NOT READ</div>
              {["The lines on your palm (heart, head, life, fate)", "Mounts, marks or skin features", "Any prediction of your future, health or relationships"].map(t => (
                <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#f87171", fontSize: 16 }}>✗</span>
                  <span style={{ fontSize: 15, color: "rgba(232,224,240,0.8)" }}>{t}</span>
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
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", color: "#e8e0f0" }}>
        <div style={{ fontSize: 14, color: "rgba(188,106,77,0.6)", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ AI VISION ENGINE ✦</div>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid rgba(188,106,77,0.18)", borderTopColor: "#BC6A4D", animation: "spin 0.9s linear infinite", marginBottom: 28 }}/>
        <div style={{ color: "#BC6A4D", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 22, textAlign: "center" }}>{processingMessage}</div>
        <div style={{ width: "100%", maxWidth: 320, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${processingPct}%`, background: "linear-gradient(90deg,#BC6A4D,#e8b23f)", borderRadius: 6, boxShadow: "0 0 10px rgba(232,178,63,0.5)", transition: "width 0.3s ease" }}/>
        </div>
      </div>
    </div>
  );

  // ── LIVE SCAN ────────────────────────────────────────────────────────────
  if (stage === "live") return (
    <div>
      <style>{`@keyframes pulse-glow{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
      {fileInput}
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", color: "#e8e0f0" }}>
        <div style={{ fontSize: 14, color: "rgba(188,106,77,0.6)", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ LIVE HAND SCANNER ✦</div>
        <div style={{ width: "100%", maxWidth: 880, marginBottom: 28, position: "relative", borderRadius: 26, overflow: "hidden", border: "2px solid rgba(188,106,77,0.25)", boxShadow: "0 0 40px rgba(188,106,77,0.16)" }}>
          <video
            ref={videoRef}
            style={{ width: "100%", height: "auto", display: "block", background: "#000" }}
            playsInline
            muted
          />
          {cameraReady && <LiveBlueprintOverlay landmarks={liveLandmarks} locked={liveLocked} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 30%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: 18, top: 18, right: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: "#fff", textAlign: "left", maxWidth: 520 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: liveLocked ? "#4ade80" : "#e8b23f",
                  boxShadow: `0 0 8px ${liveLocked ? "#4ade80" : "#e8b23f"}`,
                  animation: "pulse-glow 1.4s ease-in-out infinite",
                }} />
                <span style={{ fontSize: 13, color: liveLocked ? "#86efac" : "rgba(188,106,77,0.9)", letterSpacing: "0.2em", fontWeight: 700 }}>
                  {liveLocked ? "PALM LOCKED" : "SCANNING"}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{liveMessage}</div>
              {liveLandmarks && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(127,196,255,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#7fc4ff" }}>
                    ✋ {liveLandmarks.handedness} Hand
                  </span>
                  <span style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(127,196,255,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#7fc4ff" }}>
                    21/21 Landmarks Tracked
                  </span>
                </div>
              )}
            </div>
            <button
              style={{ ...goldBtn, background: "rgba(188,106,77,0.18)", color: "#fff", boxShadow: "none" }}
              onClick={() => { cleanupCamera(); resetToLanding(); }}
            >
              ✕ Cancel Scan
            </button>
          </div>
        </div>
        {cameraError ? (
          <div style={{ maxWidth: 640, marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ color: "#fca5a5", fontSize: 15 }}>{cameraError}</div>
            <button style={goldBtn} onClick={() => { setCameraError(null); setCameraRetryTick(t => t + 1); }}>🔄 Try Again</button>
          </div>
        ) : (
          <div style={{ maxWidth: 640, marginTop: 24, color: "rgba(232,224,240,0.75)", fontSize: 15, lineHeight: 1.7 }}>
            Keep your palm centered, fingers slightly spread, and avoid strong reflections. The blueprint scanner locks on and captures automatically once detection is stable.
          </div>
        )}
        {/* Hand type reference while the user waits for a stable lock */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 28, maxWidth: 880 }}>
          {HAND_TYPE_LEGEND.map(h => (
            <div key={h.type} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(188,106,77,0.16)", borderRadius: 20, padding: "6px 14px" }}>
              <span style={{ fontSize: 16 }}>{h.emoji}</span>
              <span style={{ fontSize: 12, color: "rgba(232,224,240,0.6)" }}>{h.label}</span>
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
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", color: "#e8e0f0" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🖐️</div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 14 }}>Let's Try That Again</h2>
        <p style={{ color: "rgba(232,224,240,0.65)", fontSize: 16, maxWidth: 440, marginBottom: 32, lineHeight: 1.7 }}>
          {retakeMessage ?? "We couldn't get a clear reading from this photo."}
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button style={goldBtn} onClick={() => fileRef.current?.click()}>📤 Upload Another Photo</button>
          <button style={{ ...goldBtn, background: "rgba(188,106,77,0.12)", color: "#BC6A4D", boxShadow: "none", border: "1px solid rgba(188,106,77,0.35)" }} onClick={resetToLanding}>← Back</button>
        </div>
      </div>
    </div>
  );

  // ── SCANNING (premium AI scan sequence, driven by the real detection result) ─
  if (stage === "scanning") {
    if (!imageUrl || !analysis) return null;
    return (
      <div>
        <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", color: "#e8e0f0" }}>
          <div style={{ fontSize: 14, color: "rgba(188,106,77,0.6)", letterSpacing: "0.3em", marginBottom: 32, fontWeight: 600 }}>✦ MEASURING YOUR HAND ✦</div>
          <div style={{
            width: "100%", maxWidth: 440, aspectRatio: `${imageDims.width} / ${imageDims.height}`,
            borderRadius: 20, overflow: "hidden", border: "2px solid rgba(188,106,77,0.4)", boxShadow: "0 0 40px rgba(188,106,77,0.25)",
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

  return (
    <div>
      <style>{`
        @keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .pr-res-grid{display:grid;grid-template-columns:minmax(0,420px) 1fr;gap:28px;align-items:start}
        .pr-measure{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        @media (max-width:860px){.pr-res-grid{grid-template-columns:1fr}.pr-measure{grid-template-columns:1fr 1fr}}
      `}</style>
      <div data-testid="palm-results" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 40px", color: "#e8e0f0" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40, animation: "fade-in 0.6s ease" }}>
          <div style={{ fontSize: 13, color: "rgba(188,106,77,0.75)", letterSpacing: "0.3em", marginBottom: 12, fontWeight: 600 }}>✦ YOUR HAND SHAPE READING ✦</div>
          <h1 style={{ fontSize: "clamp(30px,5vw,44px)", fontWeight: 900, color: "#fff", margin: "0 0 12px" }}>{shape.label}</h1>
          <p style={{ color: "rgba(232,224,240,0.7)", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
            Based on measurements of the hand in your photo. {shape.shape}.
          </p>
        </div>

        <div className="pr-res-grid">
          {/* Photo with the real detected landmarks */}
          <div>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: "2px solid rgba(188,106,77,0.4)", aspectRatio: `${imageDims.width} / ${imageDims.height}` }}>
              <img src={imageUrl} alt="Your palm photo with detected hand landmarks" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                {analysis.landmarkPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={0.007} fill="#fff6df" style={{ filter: "drop-shadow(0 0 3px #ffd98a)" }} />
                ))}
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "rgba(232,224,240,0.6)", textAlign: "center", margin: "10px 0 0", lineHeight: 1.6 }}>
              The dots are the 21 hand landmarks detected in your photo. They are used to measure your hand's proportions.
            </p>
          </div>

          <div>
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "rgba(188,106,77,0.8)", letterSpacing: "0.15em", marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>The traditional meaning of the {shape.label}</div>
              <p style={{ margin: "0 0 12px", fontSize: 17, lineHeight: 1.75, color: "rgba(232,224,240,0.9)" }}>{meaning}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgba(232,224,240,0.6)" }}>Traits traditionally linked with this hand shape: {shape.traits.toLowerCase()}.</p>
            </div>

            <div style={card}>
              <div style={{ fontSize: 13, color: "rgba(188,106,77,0.8)", letterSpacing: "0.15em", marginBottom: 14, textTransform: "uppercase", fontWeight: 700 }}>How your hand was classified</div>
              <div className="pr-measure" data-testid="palm-measures">
                <div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,240,0.55)", marginBottom: 4 }}>Palm width ÷ length</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{g.palmWidthToLengthRatio.toFixed(2)}</div>
                  <div style={{ fontSize: 13, color: "#BC6A4D" }}>{squarePalm ? "Square palm" : "Long palm"} (square at {SQUARE_PALM_MIN} or more)</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,240,0.55)", marginBottom: 4 }}>Average finger ÷ palm length</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{avgFinger.toFixed(2)}</div>
                  <div style={{ fontSize: 13, color: "#BC6A4D" }}>{longFingers ? "Long fingers" : "Short fingers"} (long at {LONG_FINGERS_MIN} or more)</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,240,0.55)", marginBottom: 4 }}>Hand in the photo</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{hand} hand</div>
                  <div style={{ fontSize: 13, color: "rgba(232,224,240,0.6)" }}>We can't tell which is your dominant hand</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,240,0.55)", marginBottom: 4 }}>Thumb angle</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{Math.round(g.thumbAngleDeg)}°</div>
                  <div style={{ fontSize: 13, color: "rgba(232,224,240,0.6)" }}>Measured, not used in the shape</div>
                </div>
              </div>
              <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.65, color: "rgba(232,224,240,0.75)" }}>
                In classical palmistry, a {squarePalm ? "square" : "long"} palm with {longFingers ? "long" : "short"} fingers is classed as the {shape.label}. Camera angle, finger spread and distance can shift these measurements, so a different photo can give a different result.
              </p>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 28, borderColor: "rgba(188,106,77,0.4)" }}>
          <div style={{ fontSize: 13, color: "rgba(188,106,77,0.9)", letterSpacing: "0.15em", marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>What this reading does not cover</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "rgba(232,224,240,0.8)" }}>
            This tool does not read the lines or marks on your palm. It measures the shape of your hand and gives the traditional description for that shape. There is no AI interpretation, no score, and no prediction of your future, health, career or relationships.
          </p>
        </div>

        <p style={{ margin: "28px auto 24px", maxWidth: 640, textAlign: "center", fontSize: 14, fontStyle: "italic", lineHeight: 1.7, color: "rgba(232,224,240,0.6)" }}>
          This reading is for personal interest and reflection. Palmistry is a traditional practice that is not scientifically proven, and the result is not a prediction or professional advice.
        </p>
        <div style={{ textAlign: "center" }}>
          <button style={goldBtn} onClick={resetToLanding}>🔄 New Palm Reading</button>
        </div>
      </div>
      <PalmEducation />
    </div>
  );
}
