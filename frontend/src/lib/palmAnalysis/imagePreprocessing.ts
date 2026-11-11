// ─── Canvas-based image preprocessing ─────────────────────────────────────────
// Real pixel-level operations (no ML model needed for these): blur detection
// via Laplacian variance, crop + rotation alignment driven by real detected
// landmarks, auto contrast/brightness, and an unsharp-mask sharpen pass.

import i18n from "@/i18n";
import type { HandLandmarks, Point, PreprocessedImage } from "./types";

const MAX_WORKING_DIM = 960; // keeps convolution passes fast and the UI responsive
const BLUR_VARIANCE_THRESHOLD = 45;
const MIN_HAND_FRACTION_OF_FRAME = 0.12; // hand bounding box must cover at least this fraction of the image

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(i18n.t("palm.errors.imageLoad")));
    img.src = dataUrl;
  });
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Laplacian-variance sharpness score on a small grayscale copy. Higher = sharper. */
export function computeBlurScore(source: HTMLImageElement | HTMLCanvasElement): number {
  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!srcW || !srcH) return 0;

  const scale = 220 / Math.max(srcW, srcH);
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = drawToCanvas(source, w, h);
  const ctx = canvas.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, w, h);

  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const lap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const value =
        4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - w] - gray[idx + w];
      lap[idx] = value;
    }
  }

  let mean = 0;
  for (let i = 0; i < lap.length; i++) mean += lap[i];
  mean /= lap.length;

  let variance = 0;
  for (let i = 0; i < lap.length; i++) variance += (lap[i] - mean) ** 2;
  variance /= lap.length;

  return variance;
}

export function isTooBlurry(blurScore: number): boolean {
  return blurScore < BLUR_VARIANCE_THRESHOLD;
}

/** Real detected-hand bounding box (normalized 0..1), from the 21 landmarks. */
export function landmarksBoundingBox(landmarks: HandLandmarks): { minX: number; minY: number; maxX: number; maxY: number } {
  const all: Point[] = [
    landmarks.wrist,
    ...landmarks.thumb,
    ...landmarks.index,
    ...landmarks.middle,
    ...landmarks.ring,
    ...landmarks.pinky,
  ];
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of all) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function isHandTooSmall(landmarks: HandLandmarks): boolean {
  const box = landmarksBoundingBox(landmarks);
  const frac = (box.maxX - box.minX) * (box.maxY - box.minY);
  return frac < MIN_HAND_FRACTION_OF_FRAME;
}

function rotatePoint(p: { x: number; y: number }, pivot: { x: number; y: number }, theta: number) {
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Auto contrast (percentile stretch) + mild brightness lift for dark shots, in place. */
function enhanceContrastBrightness(imageData: ImageData) {
  const { data } = imageData;
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[lum]++;
  }
  const totalPixels = data.length / 4;
  const lowCut = totalPixels * 0.02;
  const highCut = totalPixels * 0.98;

  let acc = 0, p2 = 0;
  for (let i = 0; i < 256; i++) { acc += histogram[i]; if (acc >= lowCut) { p2 = i; break; } }
  acc = 0;
  let p98 = 255;
  for (let i = 255; i >= 0; i--) { acc += histogram[i]; if (acc >= totalPixels - highCut) { p98 = i; break; } }
  if (p98 <= p2) { p2 = 0; p98 = 255; }

  const range = p98 - p2 || 1;
  const meanLum = histogram.reduce((s, c, i) => s + c * i, 0) / totalPixels;
  const brightnessLift = meanLum < 95 ? (95 - meanLum) * 0.35 : 0;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const stretched = ((data[i + c] - p2) / range) * 255 + brightnessLift;
      data[i + c] = clamp(stretched, 0, 255);
    }
  }
}

/** Unsharp-mask style sharpen convolution, in place. */
function sharpen(imageData: ImageData) {
  const { width: w, height: h, data } = imageData;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const src = new Uint8ClampedArray(data);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++, k++) {
            const sIdx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += src[sIdx] * kernel[k];
          }
        }
        data[idx + c] = clamp(sum, 0, 255);
      }
    }
  }
}

/**
 * Crops to the real detected palm (with padding), rotates so the hand's
 * natural "up" axis (wrist → middle-finger base) points vertically, then
 * runs contrast/brightness enhancement and a sharpen pass.
 */
export async function preprocessPalmImage(
  source: HTMLImageElement,
  landmarks: HandLandmarks,
): Promise<PreprocessedImage> {
  const srcW = source.naturalWidth;
  const srcH = source.naturalHeight;

  // Downscale the working copy for fast, responsive pixel processing.
  const workScale = Math.min(1, MAX_WORKING_DIM / Math.max(srcW, srcH));
  const workW = Math.round(srcW * workScale);
  const workH = Math.round(srcH * workScale);
  const workCanvas = drawToCanvas(source, workW, workH);
  const workCtx = workCanvas.getContext("2d")!;

  const px = (p: Point) => ({ x: p.x * workW, y: p.y * workH });
  const wrist = px(landmarks.wrist);
  const middleMcp = px(landmarks.middle[0]);
  const palmCenterPx = {
    x: (wrist.x + middleMcp.x + px(landmarks.index[0]).x + px(landmarks.ring[0]).x + px(landmarks.pinky[0]).x) / 5,
    y: (wrist.y + middleMcp.y + px(landmarks.index[0]).y + px(landmarks.ring[0]).y + px(landmarks.pinky[0]).y) / 5,
  };

  // Rotate so wrist → middle-MCP points straight up.
  const currentAngle = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
  const targetAngle = -Math.PI / 2;
  const theta = targetAngle - currentAngle;

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = workW;
  rotCanvas.height = workH;
  const rotCtx = rotCanvas.getContext("2d")!;
  rotCtx.translate(palmCenterPx.x, palmCenterPx.y);
  rotCtx.rotate(theta);
  rotCtx.translate(-palmCenterPx.x, -palmCenterPx.y);
  rotCtx.drawImage(workCanvas, 0, 0);

  // Recompute the hand's bounding box after rotation using the same transform.
  const allPx = [
    wrist, ...landmarks.thumb.map(px), ...landmarks.index.map(px),
    ...landmarks.middle.map(px), ...landmarks.ring.map(px), ...landmarks.pinky.map(px),
  ].map((p) => rotatePoint(p, palmCenterPx, theta));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPx) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const padX = boxW * 0.28;
  const padY = boxH * 0.22;
  const cropX = clamp(minX - padX, 0, workW);
  const cropY = clamp(minY - padY, 0, workH);
  const cropW = clamp(maxX + padX, 0, workW) - cropX;
  const cropH = clamp(maxY + padY, 0, workH) - cropY;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = Math.max(1, Math.round(cropW));
  finalCanvas.height = Math.max(1, Math.round(cropH));
  const finalCtx = finalCanvas.getContext("2d")!;
  finalCtx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, finalCanvas.width, finalCanvas.height);

  const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  enhanceContrastBrightness(imageData);
  sharpen(imageData);
  finalCtx.putImageData(imageData, 0, 0);

  return {
    dataUrl: finalCanvas.toDataURL("image/jpeg", 0.92),
    width: finalCanvas.width,
    height: finalCanvas.height,
  };
}
