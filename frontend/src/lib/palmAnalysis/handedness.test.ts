import { describe, it, expect } from "vitest";
import { handednessFromGeometry } from "./handLandmarkDetector";

// Landmarks 0 (wrist), 5 (index MCP), 17 (pinky MCP) from a real detection of an un-mirrored left palm
// (thumb on the image's left; see the browser run in the task notes), then rotated and mirrored.
const lm = (w: [number, number], i: [number, number], p: [number, number]) => { const a = Array.from({ length: 21 }, () => ({ x: 0, y: 0 })); a[0] = { x: w[0], y: w[1] }; a[5] = { x: i[0], y: i[1] }; a[17] = { x: p[0], y: p[1] }; return a; };
const leftPalm = lm([0.52, 0.82], [0.43, 0.46], [0.77, 0.56]);
const rot = (a: { x: number; y: number }[], deg: number) => a.map(({ x, y }) => { const r = (deg * Math.PI) / 180, dx = x - 0.5, dy = y - 0.5; return { x: 0.5 + dx * Math.cos(r) - dy * Math.sin(r), y: 0.5 + dx * Math.sin(r) + dy * Math.cos(r) }; });
const mirror = (a: { x: number; y: number }[]) => a.map(({ x, y }) => ({ x: 1 - x, y }));

describe("handednessFromGeometry", () => {
  it("identifies a left palm and a right palm (its mirror image)", () => {
    expect(handednessFromGeometry(leftPalm).hand).toBe("Left");
    expect(handednessFromGeometry(mirror(leftPalm)).hand).toBe("Right");
  });
  it("does not change when the photo is rotated", () => {
    for (const d of [30, 90, 180, 270]) expect(handednessFromGeometry(rot(leftPalm, d)).hand).toBe("Left");
  });
  it("reports a weak signal when the fingers are lined up (can't tell)", () => {
    expect(handednessFromGeometry(lm([0.5, 0.8], [0.5, 0.4], [0.505, 0.42])).strength).toBeLessThan(0.25);
  });
});
