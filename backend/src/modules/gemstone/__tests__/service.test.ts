import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { calculateRatna, parseInput, ValidationError } from "../gemstone.service.js";
import { BirthTimeError } from "../birth.time.js";
import {
  buildRuleExplanation,
  generateExplanation,
  validateExplanation,
} from "../explanation.service.js";
import { recommend } from "../recommendation.js";
import { matchShop, parseMukhi, type CatalogueProduct } from "../shop.match.js";
import { GEMSTONES } from "../gemstone.catalogue.js";
import { toPlaceResult } from "../locations.js";
import { buildWearingGuidance, nextSunriseOnWeekday } from "../wearing.js";
import { computeBirthChart } from "../chart.engine.js";

const delhi = {
  name: "New Delhi",
  admin1: "Delhi",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};
const body = { dateOfBirth: "1947-08-15", timeOfBirth: "00:00", timeUnknown: false, place: delhi };

beforeEach(() => {
  delete process.env.GROQ_API_KEY;
});

describe("request validation", () => {
  test("accepts a valid body", () => {
    assert.equal(parseInput(body).place.name, "New Delhi");
  });
  test("rejects malformed input", () => {
    assert.throws(() => parseInput(null), ValidationError);
    assert.throws(() => parseInput({ ...body, dateOfBirth: "15-08-1947" }), /YYYY-MM-DD/);
    assert.throws(() => parseInput({ ...body, timeOfBirth: "25:00" }), /HH:mm/);
    assert.throws(() => parseInput({ ...body, timeOfBirth: undefined }), /HH:mm/);
    assert.throws(() => parseInput({ ...body, place: undefined }), /select your birthplace/);
    assert.throws(() => parseInput({ ...body, place: { ...delhi, latitude: "28" } }), ValidationError);
  });
  test("time is optional only when marked unknown", () => {
    const p = parseInput({ ...body, timeOfBirth: undefined, timeUnknown: true });
    assert.equal(p.timeOfBirth, null);
  });
});

describe("calculateRatna", () => {
  test("complete result for a known chart, without AI configured", async () => {
    const r = await calculateRatna(parseInput(body));
    assert.equal(r.status, "complete");
    assert.equal(r.chart?.ascendant.sign, "Taurus");
    assert.equal(r.recommendation?.stone.key, "diamond");
    assert.equal(r.recommendation?.lagnaLord, "Venus");
    assert.equal(r.explanation.source, "rules");
    assert.match(r.explanation.fallbackReason ?? "", /not configured/);
    assert.equal(r.birth.utcOffsetMinutes, 330);
    assert.equal(r.chart?.planets.length, 9);
    assert.ok(r.wearing?.sunrise); // sunrise is computed for the next Friday
    assert.equal(r.wearing?.weekday, "Friday");
  });

  test("unknown birth time never invents an Ascendant or a stone", async () => {
    const r = await calculateRatna(parseInput({ ...body, timeOfBirth: null, timeUnknown: true }));
    assert.equal(r.status, "limited");
    assert.equal(r.chart, null);
    assert.equal(r.recommendation, null);
    assert.equal(r.wearing, null);
    assert.ok(r.stableSigns.length > 0);
    assert.ok(r.stableSigns.some((s) => s.planet === "Sun"));
    assert.match(r.explanation.text, /cannot be calculated/);
  });

  test("propagates timezone and coordinate errors", async () => {
    await assert.rejects(
      calculateRatna(parseInput({ ...body, place: { ...delhi, timezone: "Mars/Olympus" } })),
      BirthTimeError,
    );
    await assert.rejects(
      calculateRatna(parseInput({ ...body, place: { ...delhi, latitude: 80 } })),
      /66°/,
    );
    await assert.rejects(
      calculateRatna(parseInput({ ...body, place: { ...delhi, latitude: 123 } })),
      /Invalid geographic/,
    );
  });
});

const ctxFor = async () => {
  const chart = computeBirthChart(new Date("1947-08-14T18:30:00Z"), 28.6139, 77.209);
  const rec = recommend(chart);
  const planetSigns: any = {};
  for (const p of Object.values(chart.planets)) planetSigns[p.planet] = p.sign;
  return { recommendation: rec, planetSigns };
};
const okPost = (explanation: string) => (async () => ({ data: { choices: [{ message: { content: JSON.stringify({ explanation }) } }] } })) as any;

describe("AI explanation guardrails", () => {
  const good =
    "Your Ascendant is Taurus, so Venus is your Lagna lord, and Venus sits in Cancer in your chart. Traditionally, Diamond or White Sapphire is the gemstone associated with Venus. It is worn as a custom in the belief that it supports harmony, not as a guarantee of any outcome.";

  test("accepts grounded text", async () => {
    const ctx = await ctxFor();
    assert.equal(validateExplanation(good, ctx), null);
    const e = await generateExplanation(ctx, { apiKey: "k", post: okPost(good) });
    assert.equal(e.source, "ai");
  });

  const bad: [string, string][] = [
    ["wrong gemstone", good.replace("Diamond or White Sapphire", "Ruby")],
    ["other gemstone added", good + " You may also consider Ruby for extra effect on your path."],
    ["contradicted placement", good.replace("Venus sits in Cancer", "Venus sits in Leo")],
    ["wrong Ascendant", good.replace("Your Ascendant is Taurus", "Your Ascendant is Gemini")],
    ["sign not in chart", good + " Your Mars is strong in Capricorn according to the stars."],
    ["guarantee", good + " This gemstone will definitely bring you wealth and a promotion."],
    ["cure claim", good + " Many say it cures stress, and the effect is guaranteed to arrive."],
    ["too short", "Diamond."],
  ];
  for (const [name, text] of bad) {
    test(`rejects: ${name}`, async () => {
      const ctx = await ctxFor();
      assert.notEqual(validateExplanation(text, ctx), null);
      const e = await generateExplanation(ctx, { apiKey: "k", post: okPost(text) });
      assert.equal(e.source, "rules");
      assert.match(e.fallbackReason ?? "", /rejected/);
      assert.equal(e.text, buildRuleExplanation(ctx));
    });
  }

  test("falls back when the provider errors, times out or returns junk", async () => {
    const ctx = await ctxFor();
    const throwing = (async () => { throw new Error("timeout of 8000ms exceeded"); }) as any;
    assert.equal((await generateExplanation(ctx, { apiKey: "k", post: throwing })).source, "rules");
    const junk = (async () => ({ data: { choices: [{ message: { content: "not json" } }] } })) as any;
    assert.equal((await generateExplanation(ctx, { apiKey: "k", post: junk })).source, "rules");
    const empty = (async () => ({ data: {} })) as any;
    assert.equal((await generateExplanation(ctx, { apiKey: "k", post: empty })).source, "rules");
  });

  test("rule-based text reflects the real chart", async () => {
    const ctx = await ctxFor();
    const t = buildRuleExplanation(ctx);
    assert.match(t, /Taurus/);
    assert.match(t, /Venus/);
    assert.match(t, /Diamond/);
    assert.equal(validateExplanation(t, ctx), null);
  });
});

const product = (over: Partial<CatalogueProduct> & { name: string; cat: string; catName?: string }): CatalogueProduct => ({
  id: over.slug ?? over.name,
  slug: over.slug ?? over.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name: over.name,
  price: over.price ?? 1000,
  originalPrice: null,
  description: over.description ?? "Seller text",
  image: over.image ?? "https://img/x.jpg",
  category: { id: over.cat, name: over.catName ?? over.cat, slug: over.cat },
});

describe("shop matching", () => {
  const catalogue: CatalogueProduct[] = [
    product({ name: "Natural Blue Sapphire (Neelam)", cat: "gemstones", catName: "Gemstones", price: 45000 }),
    product({ name: "Yellow Sapphire", cat: "gemstones" }),
    product({ name: "Emerald", cat: "gemstones" }),
    product({ name: "Blue Sapphire Ring", cat: "rings" }),
    product({ name: "Panchmukhi Rudraksha", cat: "rudraksha" }),
    product({ name: "7 Mukhi Rudraksha", cat: "rudraksha" }),
    product({ name: "Ekamukhi Rudraksha", cat: "rudraksha" }),
    product({ name: "Tiger Eye Bracelet", cat: "bracelets" }),
    product({ name: "Sri Yantra", cat: "yantras" }),
    product({ name: "Navratri Puja Kit", cat: "puja-kits" }),
  ];

  test("returns real matching gemstone products with real price and link", () => {
    const m = matchShop(GEMSTONES["blue-sapphire"], catalogue);
    assert.deepEqual(m.gemstones.map((p) => p.name), ["Natural Blue Sapphire (Neelam)"]);
    assert.equal(m.gemstones[0].price, 45000);
    assert.equal(m.gemstones[0].url, "/shop/natural-blue-sapphire-neelam");
    assert.deepEqual(m.jewellery.map((p) => p.name), ["Blue Sapphire Ring"]);
  });

  test("does not substitute another gemstone when none is listed", () => {
    const m = matchShop(GEMSTONES.ruby, catalogue);
    assert.deepEqual(m.gemstones, []);
    assert.deepEqual(m.jewellery, []);
  });

  test("chart-linked Rudraksha uses the stated mukhi convention with a reason", () => {
    const m = matchShop(GEMSTONES["blue-sapphire"], catalogue); // Saturn -> 7 mukhi
    assert.deepEqual(m.chartLinked.map((p) => p.name), ["7 Mukhi Rudraksha"]);
    assert.match(m.chartLinked[0].reason ?? "", /common convention/);
    const j = matchShop(GEMSTONES["yellow-sapphire"], catalogue); // Jupiter -> 5 mukhi
    assert.deepEqual(j.chartLinked.map((p) => p.name), ["Panchmukhi Rudraksha"]);
  });

  test("complementary items are general, capped, and exclude chart-linked ones", () => {
    const many = [
      ...catalogue,
      ...Array.from({ length: 10 }, (_, i) => product({ name: `Bracelet ${i}`, cat: "bracelets" })),
    ];
    const m = matchShop(GEMSTONES["blue-sapphire"], many);
    assert.equal(m.complementary.length, 6);
    assert.ok(m.complementary.every((p) => !p.reason));
    assert.ok(!m.complementary.some((p) => p.name === "7 Mukhi Rudraksha"));
    assert.ok(!m.complementary.some((p) => p.categorySlug === "puja-kits"));
  });

  test("empty catalogue gives empty sections", () => {
    const m = matchShop(GEMSTONES.pearl, []);
    assert.deepEqual([m.gemstones, m.jewellery, m.chartLinked, m.complementary], [[], [], [], []]);
  });

  test("does not invent stock counts or discounts", () => {
    const m = matchShop(GEMSTONES["blue-sapphire"], catalogue);
    const keys = Object.keys(m.gemstones[0]);
    assert.ok(!keys.some((k) => /stock|inventory|left|scarcity/i.test(k)));
    assert.equal(m.gemstones[0].originalPrice, null);
  });

  test("parseMukhi", () => {
    assert.equal(parseMukhi("5 Mukhi Rudraksha"), 5);
    assert.equal(parseMukhi("Panchmukhi Rudraksha"), 5);
    assert.equal(parseMukhi("Ekamukhi Rudraksha"), 1);
    assert.equal(parseMukhi("Gauri Shankar Rudraksha"), null);
  });
});

describe("locations and wearing", () => {
  test("toPlaceResult requires coordinates and a valid time zone", () => {
    assert.equal(toPlaceResult({ name: "X", latitude: 1, longitude: 2, timezone: "Nope/Zone" }), null);
    assert.equal(toPlaceResult({ name: "X", latitude: "1", longitude: 2, timezone: "Asia/Kolkata" }), null);
    const ok = toPlaceResult({ id: 1, name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5, longitude: 73.8, timezone: "Asia/Kolkata" });
    assert.equal(ok?.label, "Pune, Maharashtra, India");
  });

  test("sunrise falls on the traditional weekday at the birthplace", () => {
    const from = new Date("2026-10-27T00:00:00Z"); // Tuesday
    const rise = nextSunriseOnWeekday("Thursday", 28.6139, 77.209, "Asia/Kolkata", from);
    assert.ok(rise);
    const local = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(rise!);
    assert.match(local, /Thursday/);
    assert.match(local, /0[5-7]:/); // Delhi sunrise in late Oct/early Nov ~06:30
  });

  test("wearing guidance labels the birthplace as the location used", () => {
    const g = buildWearingGuidance(GEMSTONES.ruby, { label: "New Delhi, India", latitude: 28.6, longitude: 77.2, timeZone: "Asia/Kolkata" });
    assert.equal(g.weekday, "Sunday");
    assert.match(g.sunrise?.locationLabel ?? "", /your birthplace/);
  });

  test("no sunrise in polar-night conditions degrades to weekday only", () => {
    const g = buildWearingGuidance(GEMSTONES.ruby, { label: "Svalbard", latitude: 78, longitude: 15, timeZone: "Arctic/Longyearbyen" }, new Date("2026-12-01T00:00:00Z"));
    assert.equal(g.sunrise, null);
    assert.match(g.sunriseNote, /No exact time was calculated/);
  });
});
