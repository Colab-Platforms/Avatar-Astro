/**
 * Nakshatra PADA boundaries checked against Drik Panchang.
 *
 * Reference: Drik Panchang daily pages, read 2026-11-07, the "Nakshatra Pada" rows
 *   https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1275339&date=18/12/2026   (Mumbai)
 *   https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1261481&date=11/02/2027   (New Delhi)
 * Each row prints when a pada ENDS, in local time (Asia/Kolkata, UTC+05:30). The pages were read through a fetching tool,
 * so this data carries that tool's transcription risk. Drik prints whole minutes; the Moon crosses a pada (3 deg 20 min) in
 * about six hours, so a three-minute tolerance is about 0.03 degrees.
 *
 * The test finds the instant at which OUR engine's (nakshatra, pada) leaves the stated pada, and compares that instant with
 * the time Drik prints. It does not assume our table is right: it measures the difference.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { limbsAt } from "../panchang.js";

interface Ref { id: string; endsIst: string; nakshatra: string; pada: number; next: { nakshatra: string; pada: number } }

const IST = (s: string) => new Date(`${s}+05:30`);

const REFS: Ref[] = [
  // Mumbai, 18 Dec 2026
  { id: "Mumbai UB pada 3", endsIst: "2026-12-18T10:05:00", nakshatra: "Uttara Bhadrapada", pada: 3, next: { nakshatra: "Uttara Bhadrapada", pada: 4 } },
  { id: "Mumbai UB pada 4 -> Revati", endsIst: "2026-12-18T16:10:00", nakshatra: "Uttara Bhadrapada", pada: 4, next: { nakshatra: "Revati", pada: 1 } },
  { id: "Mumbai Revati pada 1", endsIst: "2026-12-18T22:12:00", nakshatra: "Revati", pada: 1, next: { nakshatra: "Revati", pada: 2 } },
  { id: "Mumbai Revati pada 2", endsIst: "2026-12-19T04:10:00", nakshatra: "Revati", pada: 2, next: { nakshatra: "Revati", pada: 3 } },
  // New Delhi, 11 Feb 2027
  { id: "Delhi Revati pada 1", endsIst: "2027-02-11T11:10:00", nakshatra: "Revati", pada: 1, next: { nakshatra: "Revati", pada: 2 } },
  { id: "Delhi Revati pada 2", endsIst: "2027-02-11T17:22:00", nakshatra: "Revati", pada: 2, next: { nakshatra: "Revati", pada: 3 } },
  { id: "Delhi Revati pada 3", endsIst: "2027-02-11T23:33:00", nakshatra: "Revati", pada: 3, next: { nakshatra: "Revati", pada: 4 } },
  { id: "Delhi Revati pada 4 -> Ashwini", endsIst: "2027-02-12T05:42:00", nakshatra: "Revati", pada: 4, next: { nakshatra: "Ashwini", pada: 1 } },
];

const state = (t: Date) => { const l = limbsAt(t); return `${l.nakshatra.name}/${l.nakshatra.pada}`; };

/** The instant (to the second) at which the engine leaves `from`, searching 40 minutes either side of `around`. */
const leaves = (around: Date, from: string): Date => {
  let lo = around.getTime() - 40 * 60_000, hi = around.getTime() + 40 * 60_000;
  assert.equal(state(new Date(lo)), from, "40 minutes before the printed time the engine should still be in the stated pada");
  while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (state(new Date(mid)) === from) lo = mid; else hi = mid; }
  return new Date(hi);
};

describe("Nakshatra pada boundaries agree with Drik Panchang", () => {
  const diffs: string[] = [];
  for (const r of REFS) {
    it(`${r.id}: ends within 3 minutes of ${r.endsIst.slice(11, 16)} IST, and the next pada is the one Drik shows`, () => {
      const ref = IST(r.endsIst);
      const t = leaves(ref, `${r.nakshatra}/${r.pada}`);
      const minutes = (t.getTime() - ref.getTime()) / 60_000;
      diffs.push(`${r.id}: ${minutes >= 0 ? "+" : ""}${minutes.toFixed(1)} min`);
      assert.ok(Math.abs(minutes) <= 3, `${r.id}: engine boundary differs from Drik by ${minutes.toFixed(1)} min`);
      assert.equal(state(new Date(t.getTime() + 60_000)), `${r.next.nakshatra}/${r.next.pada}`);
    });
  }
  it("(prints the measured differences)", () => { console.log("pada boundary differences from Drik:\n  " + diffs.join("\n  ")); });
});
