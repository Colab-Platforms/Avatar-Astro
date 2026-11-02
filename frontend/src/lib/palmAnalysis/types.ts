// ─── Palm Analysis Engine — shared types ──────────────────────────────────────
// The UI (scan animation, overlay, dashboard) only ever talks to the
// `PalmAnalysisEngine` interface below. Today it's implemented by real
// MediaPipe Hands landmark detection + landmark-anchored geometric line
// placement (see engine.ts). A future real palm-line segmentation model
// (custom CNN, ONNX Runtime Web, etc.) can replace the implementation
// without any UI changes — it just needs to return the same shape.

export interface Point {
  x: number; // normalized 0..1, relative to the analyzed image
  y: number;
}

// MediaPipe Hands 21-point landmark topology (real, detected).
export interface HandLandmarks {
  wrist: Point;
  thumb: [Point, Point, Point, Point];       // CMC, MCP, IP, TIP
  index: [Point, Point, Point, Point];       // MCP, PIP, DIP, TIP
  middle: [Point, Point, Point, Point];
  ring: [Point, Point, Point, Point];
  pinky: [Point, Point, Point, Point];
  handedness: "Left" | "Right";
  /** False when the fingers are too bunched or edge-on to tell left from right reliably. */
  handednessCertain?: boolean;
  confidence: number; // 0..1
}

export type PalmLineId = "heart" | "head" | "life" | "fate" | "sun";

export interface PalmLine {
  id: PalmLineId;
  label: string;
  color: string;
  /** SVG path `d` string in normalized 0..1 space (same space as landmarks) — render with viewBox="0 0 1 1". */
  path: string;
  /** Approximate path length in normalized units — used to time the "tracing" animation. */
  length: number;
  /** Straight-line distance between the path's start and end points, same units as `length`. */
  straightLength: number;
}

export interface MinorMark {
  kind: "marriage" | "wrist";
  path: string;
}

export interface Mount {
  name: string;
  planet: string;
  /** Center point in normalized 0..1 space. */
  point: Point;
  /** Derived strength 0..100, from real geometry (finger length / spacing / thumb angle), not random. */
  strength: number;
}

export type HandType = "Earth" | "Air" | "Water" | "Fire";

export interface PalmGeometry {
  handType: HandType;
  dominance: "Right (Active)" | "Left (Receptive)";
  thumbAngleDeg: number;
  fingerLengthRatios: { index: number; middle: number; ring: number; pinky: number };
  palmWidthToLengthRatio: number;
}

export interface PalmAnalysisResult {
  landmarks: HandLandmarks;
  geometry: PalmGeometry;
  lines: Record<PalmLineId, PalmLine>;
  minorMarks: MinorMark[];
  mounts: Mount[];
  /** Palm boundary polygon in normalized 0..1 space, derived from real landmarks. */
  palmBoundary: Point[];
  /** Fingertip + joint markers in normalized 0..1 space, for the landmark-dot overlay. */
  landmarkPoints: Point[];
}

export type ImageQualityIssue = "no_hand_detected" | "too_blurry" | "hand_too_small" | "low_confidence";

export interface ImageQualityCheck {
  ok: boolean;
  issue?: ImageQualityIssue;
  message?: string;
  blurScore: number;
}

export interface PreprocessedImage {
  /** Data URL of the cropped, aligned, enhanced palm image ready for display + analysis. */
  dataUrl: string;
  width: number;
  height: number;
}

export type ScanPhase =
  | "detecting_palm"
  | "finding_edges"
  | "building_mesh"
  | "tracing_life"
  | "tracing_heart"
  | "tracing_head"
  | "tracing_fate"
  | "minor_lines"
  | "mounts"
  | "finalizing";

export interface PalmAnalysisEngine {
  /** Loads/warms the underlying model. Safe to call multiple times. */
  ensureReady(onProgress?: (pct: number) => void): Promise<void>;
  /** Runs real landmark detection on an <img>/<canvas> and reports a quality gate. */
  checkQuality(source: HTMLImageElement | HTMLCanvasElement): Promise<ImageQualityCheck & { landmarks: HandLandmarks | null }>;
  /** Crops/aligns/enhances the source image around the detected hand. */
  preprocess(source: HTMLImageElement | HTMLCanvasElement, landmarks: HandLandmarks): Promise<PreprocessedImage>;
  /** Produces the full analysis (lines, mounts, geometry) from landmarks re-detected on the processed image. */
  analyze(source: HTMLImageElement | HTMLCanvasElement, landmarks: HandLandmarks): Promise<PalmAnalysisResult>;
}
