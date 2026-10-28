// ─── Landmark-anchored palm geometry ──────────────────────────────────────────
// Real MediaPipe landmarks give us the hand's true position, scale, rotation
// and finger proportions. This module builds a local "palm frame" from those
// real points (origin = wrist, up-axis = wrist→middle-knuckle, width-axis =
// thumb→pinky) and places classical palmistry lines/mounts as coordinates
// *within that frame* — so every curve scales, rotates and repositions with
// the user's actual hand instead of sitting at fixed pixel coordinates.
//
// This is NOT learned crease segmentation (no model currently exists for
// that outside custom-trained research systems) — it's geometry anchored to
// real detection. `PalmAnalysisEngine.analyze()` is the single seam where a
// future real line-segmentation model would replace this module.

import type {
  HandLandmarks, HandType, MinorMark, Mount, Point, PalmGeometry, PalmLine, PalmLineId,
} from "./types";

type Local = [u: number, v: number]; // u: 0 wrist → 1 knuckle line (and beyond); v: 0 thumb side → 1 pinky side

interface PalmFrame {
  toXY(p: Local): Point;
}

const LINE_META: Record<PalmLineId, { label: string; color: string }> = {
  heart: { label: "Heart Line", color: "#e8506b" },
  head: { label: "Head Line", color: "#4f8ff0" },
  life: { label: "Life Line", color: "#3fcf7f" },
  fate: { label: "Fate Line", color: "#9b6bf0" },
  sun: { label: "Sun Line", color: "#e8b23f" },
};

function buildPalmFrame(landmarks: HandLandmarks): PalmFrame & { palmLength: number; palmWidth: number } {
  const wrist = landmarks.wrist;
  const middleMcp = landmarks.middle[0];
  const thumbCmc = landmarks.thumb[0];
  const pinkyMcp = landmarks.pinky[0];

  const upRaw = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
  const upLen = Math.hypot(upRaw.x, upRaw.y) || 1e-6;
  const up = { x: upRaw.x / upLen, y: upRaw.y / upLen };

  let right = { x: up.y, y: -up.x };
  const widthVec = { x: pinkyMcp.x - thumbCmc.x, y: pinkyMcp.y - thumbCmc.y };
  if (right.x * widthVec.x + right.y * widthVec.y < 0) right = { x: -right.x, y: -right.y };

  const palmLength = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y) || 1e-6;
  const palmWidth = Math.hypot(pinkyMcp.x - thumbCmc.x, pinkyMcp.y - thumbCmc.y) || 1e-6;

  return {
    palmLength,
    palmWidth,
    toXY([u, v]: Local): Point {
      return {
        x: wrist.x + up.x * u * palmLength + right.x * (v - 0.5) * palmWidth,
        y: wrist.y + up.y * u * palmLength + right.y * (v - 0.5) * palmWidth,
      };
    },
  };
}

function cubicLength(p0: Point, c1: Point, c2: Point, p1: Point, steps = 16): number {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * p1.x;
    const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * p1.y;
    len += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return len;
}

/** points: [P0, C1, C2, P1, C3, C4, P2, ...] — flat multi-segment cubic path in local (u,v) coords. */
function buildPath(frame: PalmFrame, points: Local[]): { path: string; length: number; straightLength: number } {
  const xy = points.map((p) => frame.toXY(p));
  let d = `M ${xy[0].x.toFixed(4)} ${xy[0].y.toFixed(4)} `;
  let length = 0;
  for (let i = 1; i + 2 <= xy.length - 1; i += 3) {
    const c1 = xy[i], c2 = xy[i + 1], p1 = xy[i + 2];
    d += `C ${c1.x.toFixed(4)} ${c1.y.toFixed(4)} ${c2.x.toFixed(4)} ${c2.y.toFixed(4)} ${p1.x.toFixed(4)} ${p1.y.toFixed(4)} `;
    length += cubicLength(xy[i - 1], c1, c2, p1);
  }
  const straightLength = Math.hypot(xy[xy.length - 1].x - xy[0].x, xy[xy.length - 1].y - xy[0].y);
  return { path: d.trim(), length, straightLength };
}

function buildLines(frame: ReturnType<typeof buildPalmFrame>): Record<PalmLineId, PalmLine> {
  const specs: Record<PalmLineId, Local[]> = {
    heart: [
      [0.90, 0.93], [0.98, 0.68], [0.96, 0.35], [0.87, 0.08],
    ],
    head: [
      [0.80, 0.08], [0.66, 0.30], [0.56, 0.55], [0.48, 0.85],
    ],
    life: [
      [0.82, 0.14], [0.52, 0.02], [0.14, 0.04], [0.04, 0.28],
      [-0.03, 0.44], [0.00, 0.62], [0.10, 0.80],
    ],
    fate: [
      [0.04, 0.52], [0.32, 0.51], [0.62, 0.50], [0.92, 0.48],
    ],
    sun: [
      [0.28, 0.74], [0.48, 0.72], [0.68, 0.70], [0.85, 0.67],
    ],
  };

  const out = {} as Record<PalmLineId, PalmLine>;
  (Object.keys(specs) as PalmLineId[]).forEach((id) => {
    const { path, length, straightLength } = buildPath(frame, specs[id]);
    out[id] = { id, label: LINE_META[id].label, color: LINE_META[id].color, path, length, straightLength };
  });
  return out;
}

function buildMinorMarks(frame: ReturnType<typeof buildPalmFrame>): MinorMark[] {
  const marks: MinorMark[] = [];
  // Marriage lines — short ticks on the ulnar (pinky) edge, just below the pinky mount.
  [0.90, 0.85].forEach((u, i) => {
    const { path } = buildPath(frame, [[u, 0.97], [u - 0.01, 0.99], [u - 0.015, 1.0], [u - 0.03, 1.02 - i * 0.01]]);
    marks.push({ kind: "marriage", path });
  });
  // Wrist lines (rascettes) — gentle arcs just below the wrist point.
  [-0.05, -0.11].forEach((u) => {
    const { path } = buildPath(frame, [[u, 0.12], [u - 0.02, 0.4], [u - 0.02, 0.6], [u, 0.88]]);
    marks.push({ kind: "wrist", path });
  });
  return marks;
}

function buildMounts(
  frame: ReturnType<typeof buildPalmFrame>,
  ratios: PalmGeometry["fingerLengthRatios"],
  thumbAngleDeg: number,
  palmWidthToLengthRatio: number,
): Mount[] {
  const norm = (r: number) => Math.round(clamp01((r - 0.55) / (1.05 - 0.55)) * 100);
  return [
    { name: "Mount of Jupiter", planet: "Jupiter", point: frame.toXY([0.88, 0.15]), strength: norm(ratios.index) },
    { name: "Mount of Saturn", planet: "Saturn", point: frame.toXY([0.92, 0.42]), strength: norm(ratios.middle) },
    { name: "Mount of Sun", planet: "Sun", point: frame.toXY([0.88, 0.68]), strength: norm(ratios.ring) },
    { name: "Mount of Mercury", planet: "Mercury", point: frame.toXY([0.82, 0.92]), strength: norm(ratios.pinky) },
    { name: "Mount of Venus", planet: "Venus", point: frame.toXY([0.15, 0.10]), strength: Math.round(clamp01(thumbAngleDeg / 55) * 100) },
    { name: "Mount of Moon", planet: "Moon", point: frame.toXY([0.15, 0.90]), strength: Math.round(clamp01((palmWidthToLengthRatio - 0.7) / 0.6) * 100) },
    { name: "Mount of Mars", planet: "Mars", point: frame.toXY([0.45, 0.50]), strength: Math.round(clamp01(1 - Math.abs(palmWidthToLengthRatio - 1)) * 100) },
  ];
}

/** Classical hand-shape thresholds: palm width ÷ length at/above this is a "square" palm; mean finger ÷ palm length at/above this is "long" fingers. */
export const SQUARE_PALM_MIN = 0.85;
export const LONG_FINGERS_MIN = 0.78;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function fingerLength(mcp: Point, tip: Point) {
  return Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
}

function computeGeometry(landmarks: HandLandmarks, palmLength: number, palmWidth: number): PalmGeometry {
  const indexLen = fingerLength(landmarks.index[0], landmarks.index[3]);
  const middleLen = fingerLength(landmarks.middle[0], landmarks.middle[3]);
  const ringLen = fingerLength(landmarks.ring[0], landmarks.ring[3]);
  const pinkyLen = fingerLength(landmarks.pinky[0], landmarks.pinky[3]);

  const fingerLengthRatios = {
    index: indexLen / palmLength,
    middle: middleLen / palmLength,
    ring: ringLen / palmLength,
    pinky: pinkyLen / palmLength,
  };
  const avgFingerRatio = (fingerLengthRatios.index + fingerLengthRatios.middle + fingerLengthRatios.ring + fingerLengthRatios.pinky) / 4;
  const palmWidthToLengthRatio = palmWidth / palmLength;

  // Classical palmistry hand-shape classification, driven by real measured ratios.
  let handType: HandType;
  const squarePalm = palmWidthToLengthRatio >= SQUARE_PALM_MIN;
  const longFingers = avgFingerRatio >= LONG_FINGERS_MIN;
  if (squarePalm && !longFingers) handType = "Earth";
  else if (squarePalm && longFingers) handType = "Air";
  else if (!squarePalm && longFingers) handType = "Water";
  else handType = "Fire";

  // Thumb splay angle: angle between the thumb's MCP→TIP vector and the palm's width axis.
  const thumbVec = { x: landmarks.thumb[3].x - landmarks.thumb[1].x, y: landmarks.thumb[3].y - landmarks.thumb[1].y };
  const widthVec = { x: landmarks.pinky[0].x - landmarks.thumb[0].x, y: landmarks.pinky[0].y - landmarks.thumb[0].y };
  const dot = thumbVec.x * widthVec.x + thumbVec.y * widthVec.y;
  const mags = (Math.hypot(thumbVec.x, thumbVec.y) * Math.hypot(widthVec.x, widthVec.y)) || 1e-6;
  const thumbAngleDeg = (Math.acos(clamp01(Math.abs(dot / mags))) * 180) / Math.PI;

  return {
    handType,
    dominance: landmarks.handedness === "Right" ? "Right (Active)" : "Left (Receptive)",
    thumbAngleDeg,
    fingerLengthRatios,
    palmWidthToLengthRatio,
  };
}

function buildPalmBoundary(landmarks: HandLandmarks): Point[] {
  return [
    landmarks.thumb[0], landmarks.index[0], landmarks.middle[0],
    landmarks.ring[0], landmarks.pinky[0], landmarks.wrist,
  ];
}

function buildLandmarkPoints(landmarks: HandLandmarks): Point[] {
  return [
    landmarks.wrist,
    ...landmarks.thumb, ...landmarks.index, ...landmarks.middle, ...landmarks.ring, ...landmarks.pinky,
  ];
}

export function estimatePalmFeatures(landmarks: HandLandmarks) {
  const frame = buildPalmFrame(landmarks);
  const geometry = computeGeometry(landmarks, frame.palmLength, frame.palmWidth);
  return {
    lines: buildLines(frame),
    minorMarks: buildMinorMarks(frame),
    mounts: buildMounts(frame, geometry.fingerLengthRatios, geometry.thumbAngleDeg, geometry.palmWidthToLengthRatio),
    geometry,
    palmBoundary: buildPalmBoundary(landmarks),
    landmarkPoints: buildLandmarkPoints(landmarks),
  };
}
