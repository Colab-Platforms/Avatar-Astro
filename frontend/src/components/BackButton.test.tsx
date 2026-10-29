import { describe, it, expect } from "vitest";
import { getFallback } from "./BackButton";

describe("BackButton fallback parents", () => {
  it.each([
    ["/inner-voice/wisdom", "/inner-voice"],
    ["/inner-voice/dashboard", "/inner-voice"],
    ["/avatar-live/darshan", "/avatar-live"],
    ["/avatar-live/family", "/avatar-live"],
    ["/avatar-live/darshan/tirupati-balaji", "/avatar-live/darshan"],
    ["/zodiac/aries", "/zodiac"],
    ["/shop/blue-sapphire", "/shop"],
    ["/puja/some-temple", "/puja"],
    ["/chadhawa/tirupati-balaji", "/chadhawa"],
    ["/ratna-jyotish/result", "/ratna-jyotish"],
    ["/tarot", "/"],
    ["/something-unknown", "/"],
  ])("%s -> %s", (from, to) => {
    expect(getFallback(from)).toBe(to);
  });
});
