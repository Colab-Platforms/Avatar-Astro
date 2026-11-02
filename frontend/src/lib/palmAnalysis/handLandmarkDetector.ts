// ─── Real hand landmark detection via MediaPipe Hands (Tasks Vision) ─────────
// This is the one genuinely-AI-detected part of the pipeline: 21 real hand
// keypoints (wrist, finger joints, fingertips) run client-side via WASM.
// Everything downstream (palm lines, mounts, shape) is geometry derived from
// these real points — see lineEstimator.ts.
//
// The MediaPipe module + model asset are large (~10MB combined), so they're
// dynamically imported and only fetched the first time detection is needed,
// not on page load.

import type { HandLandmarks, Point } from "./types";

// Lazily typed to avoid pulling the (large) @mediapipe/tasks-vision types
// into every file that imports HandLandmarks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MPHandLandmarker = any;

let landmarkerPromise: Promise<MPHandLandmarker> | null = null;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

async function loadLandmarker(onProgress?: (pct: number) => void): Promise<MPHandLandmarker> {
  onProgress?.(5);
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  onProgress?.(35);
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  onProgress?.(60);
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
  });
  onProgress?.(100);
  return handLandmarker;
}

/** Warms up (or returns the already-warm) singleton MediaPipe HandLandmarker. */
export function ensureHandLandmarker(onProgress?: (pct: number) => void): Promise<MPHandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = loadLandmarker(onProgress).catch((err) => {
      landmarkerPromise = null; // allow retry on next call
      throw err;
    });
  } else {
    onProgress?.(100);
  }
  return landmarkerPromise;
}

const LANDMARK_INDEX = {
  wrist: 0,
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
} as const;

function toPoint(lm: { x: number; y: number }): Point {
  return { x: lm.x, y: lm.y };
}

/**
 * Which hand is this, judged from the landmarks themselves. For a palm facing the camera in an un-mirrored photo, a RIGHT hand
 * has its index finger clockwise of its little finger as seen from the wrist (negative cross product in image coordinates,
 * where y points down). This does not depend on how the photo is rotated. MediaPipe's own label assumes a mirrored selfie
 * image and also flips when the back of the hand is shown, so it is only used as a cross-check, never as the answer.
 * `strength` is the normalised size of the cross product: near 0 means the fingers are too bunched or edge-on to tell.
 */
export function handednessFromGeometry(lm: Array<{ x: number; y: number }>): { hand: "Left" | "Right"; strength: number } {
  const w = lm[0], i = lm[5], p = lm[17];
  const ax = i.x - w.x, ay = i.y - w.y, bx = p.x - w.x, by = p.y - w.y;
  const cross = ax * by - ay * bx;
  const norm = Math.hypot(ax, ay) * Math.hypot(bx, by) || 1;
  return { hand: cross < 0 ? "Right" : "Left", strength: Math.abs(cross) / norm };
}

/**
 * Runs real detection on an image/canvas and returns the first detected
 * hand's 21 landmarks in our shape, or null if no hand was found.
 */
export async function detectHandLandmarks(
  source: HTMLImageElement | HTMLCanvasElement,
  onProgress?: (pct: number) => void,
): Promise<HandLandmarks | null> {
  const landmarker = await ensureHandLandmarker(onProgress);
  const result = landmarker.detect(source);
  if (!result?.landmarks?.length) return null;

  const lm = result.landmarks[0] as Array<{ x: number; y: number }>;
  const geo = handednessFromGeometry(lm);
  const confidence: number = result.handedness?.[0]?.[0]?.score ?? 0.75;

  return {
    wrist: toPoint(lm[LANDMARK_INDEX.wrist]),
    thumb: LANDMARK_INDEX.thumb.map((i) => toPoint(lm[i])) as HandLandmarks["thumb"],
    index: LANDMARK_INDEX.index.map((i) => toPoint(lm[i])) as HandLandmarks["index"],
    middle: LANDMARK_INDEX.middle.map((i) => toPoint(lm[i])) as HandLandmarks["middle"],
    ring: LANDMARK_INDEX.ring.map((i) => toPoint(lm[i])) as HandLandmarks["ring"],
    pinky: LANDMARK_INDEX.pinky.map((i) => toPoint(lm[i])) as HandLandmarks["pinky"],
    handedness: geo.hand,
    handednessCertain: geo.strength >= 0.25,
    confidence,
  };
}
