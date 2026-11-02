// ─── Palm Analysis Engine (default implementation) ────────────────────────────
// Composes real MediaPipe hand-landmark detection with landmark-anchored
// geometry (lineEstimator) and canvas preprocessing. This is the one class
// the UI depends on — swap `defaultPalmAnalysisEngine` for a different
// implementation (e.g. one backed by a real trained line-segmentation model)
// without touching any component.

import type {
  HandLandmarks, ImageQualityCheck, PalmAnalysisEngine, PalmAnalysisResult, PreprocessedImage,
} from "./types";
import { detectHandLandmarks, ensureHandLandmarker } from "./handLandmarkDetector";
import { computeBlurScore, isTooBlurry, isHandTooSmall, preprocessPalmImage } from "./imagePreprocessing";
import { estimatePalmFeatures } from "./lineEstimator";

class DefaultPalmAnalysisEngine implements PalmAnalysisEngine {
  async ensureReady(onProgress?: (pct: number) => void): Promise<void> {
    await ensureHandLandmarker(onProgress);
  }

  async checkQuality(
    source: HTMLImageElement | HTMLCanvasElement,
  ): Promise<ImageQualityCheck & { landmarks: HandLandmarks | null }> {
    const blurScore = computeBlurScore(source);
    const landmarks = await detectHandLandmarks(source);

    if (!landmarks) {
      return { ok: false, issue: "no_hand_detected", message: "We couldn't clearly detect a palm in this photo.", blurScore, landmarks: null };
    }
    if (landmarks.confidence < 0.55) {
      return { ok: false, issue: "low_confidence", message: "Palm detection confidence is low — try better lighting.", blurScore, landmarks };
    }
    if (landmarks.handednessCertain === false) {
      return { ok: false, issue: "low_confidence", message: "We can't tell which hand this is from the photo. Please upload a clear photo with your palm facing the camera and fingers slightly apart.", blurScore, landmarks };
    }
    if (isTooBlurry(blurScore)) {
      return { ok: false, issue: "too_blurry", message: "This image looks a little blurry for a precise reading.", blurScore, landmarks };
    }
    if (isHandTooSmall(landmarks)) {
      return { ok: false, issue: "hand_too_small", message: "Move your hand closer — it's too small in the frame.", blurScore, landmarks };
    }
    return { ok: true, blurScore, landmarks };
  }

  async preprocess(source: HTMLImageElement | HTMLCanvasElement, landmarks: HandLandmarks): Promise<PreprocessedImage> {
    if (!(source instanceof HTMLImageElement)) {
      // Camera frames arrive as canvases already; wrap for the shared pipeline.
      const dataUrl = source.toDataURL("image/jpeg", 0.95);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load captured frame"));
        img.src = dataUrl;
      });
      return preprocessPalmImage(img, landmarks);
    }
    return preprocessPalmImage(source, landmarks);
  }

  async analyze(source: HTMLImageElement | HTMLCanvasElement, landmarks: HandLandmarks): Promise<PalmAnalysisResult> {
    // Re-detect on the final (cropped/aligned) image so all overlay geometry
    // is anchored to exactly the pixels the user will see.
    const refined = (await detectHandLandmarks(source)) ?? landmarks;
    const features = estimatePalmFeatures(refined);
    return {
      landmarks: refined,
      geometry: features.geometry,
      lines: features.lines,
      minorMarks: features.minorMarks,
      mounts: features.mounts,
      palmBoundary: features.palmBoundary,
      landmarkPoints: features.landmarkPoints,
    };
  }
}

export const defaultPalmAnalysisEngine: PalmAnalysisEngine = new DefaultPalmAnalysisEngine();

export * from "./types";
